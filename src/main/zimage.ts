import type { ZImageOptions } from '@shared/type/zimage'
import type { IpcMainEvent } from 'electron'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, normalize } from 'node:path'

import { IpcChannelOn } from '@shared/const/ipc'

import { getCorePath } from './getCorePath'
import { PRESET_MODELS } from './modelManager'

let zImageChild: ChildProcessWithoutNullStreams | null = null
let isBatchStopped = false

export async function getZImageModels(): Promise<string[]> {
  const corePath = getCorePath()
  const executableDir = join(corePath, '..') // .../FinalDream-core
  const modelsDir = join(executableDir, '..', 'models') // .../models

  try {
    const entries = await readdir(modelsDir, { withFileTypes: true })
    const folders = entries
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    // Filter out incomplete preset models
    return folders.filter((modelName) => {
      // If it's a known preset, verify strictly (fast check: items existence)
      if (PRESET_MODELS[modelName]) {
        const requiredFiles = PRESET_MODELS[modelName]
        const modelPath = join(modelsDir, modelName)

        console.log(`[Validation] Checking model: ${modelName}`)
        console.log(`[Validation] Path: ${modelPath}`)

        // Find missing files
        const missing = requiredFiles.filter((file) => {
          const exists = existsSync(join(modelPath, file.name))
          if (!exists)
            console.log(`[Validation] Missing: ${join(modelPath, file.name)}`)
          return !exists
        })

        if (missing.length > 0) {
          console.warn(`Model ${modelName} found but incomplete. Missing: ${missing.map(m => m.name).join(', ')}`)
          return false
        }
      }
      return true
    })
  }
  catch (error) {
    console.error('Failed to read models directory:', error)
    return []
  }
}

async function runSingleZImage(event: IpcMainEvent, args: string[], executablePath: string, executableDir: string): Promise<number> {
  return new Promise((resolve) => {
    zImageChild = spawn(executablePath, args, {
      cwd: executableDir,
    })

    zImageChild.stdout.on('data', (data) => {
      event.sender.send(IpcChannelOn.COMMAND_STDOUT, data.toString())
    })

    zImageChild.stderr.on('data', (data) => {
      event.sender.send(IpcChannelOn.COMMAND_STDERR, data.toString())
    })

    zImageChild.on('close', (code) => {
      event.sender.send(IpcChannelOn.COMMAND_CLOSE, code)
      console.log(`ZImage process exited with code: ${code}`)
      zImageChild = null
      resolve(code ?? 0)
    })

    zImageChild.on('error', (err) => {
      event.sender.send(IpcChannelOn.COMMAND_CLOSE, err.toString())
      console.error('Failed to start subprocess:', err)
      zImageChild = null
      resolve(-1)
    })
  })
}

export async function runZImageCommand(event: IpcMainEvent, options: ZImageOptions): Promise<void> {
  isBatchStopped = false
  const executablePath = getCorePath()
  const executableDir = join(executablePath, '..')
  const count = options.count || 1

  console.log(`Starting batch generation: ${count} images`)

  for (let i = 0; i < count; i++) {
    if (isBatchStopped) {
      console.log('Batch generation stopped by user.')
      break
    }

    // dynamic filename
    const timestamp = Date.now()
    const filename = `out-${timestamp}-${i + 1}.png`
    const outputPath = options.outputFolder
      ? join(normalize(options.outputFolder), filename)
      : join(executableDir, filename) // fallback

    // Construct arguments
    const args: string[] = []
    args.push('-p', options.prompt)

    if (options.negativePrompt) {
      args.push('-n', options.negativePrompt)
    }

    // output
    args.push('-o', outputPath)

    if (options.width && options.height) {
      args.push('-s', `${options.width},${options.height}`)
    }

    if (options.steps && options.steps !== 'auto') {
      args.push('-l', `${options.steps}`)
    }

    if (options.seed && options.seed !== 'rand') {
      args.push('-r', `${options.seed}`)
    }

    if (options.model) {
      const modelPath = join(executableDir, '..', 'models', options.model)
      args.push('-m', normalize(modelPath))
    }

    if (options.gpuId && options.gpuId !== 'auto') {
      args.push('-g', `${options.gpuId}`)
    }

    console.log(`[Batch ${i + 1}/${count}] Executing ZImage:`, executablePath, args)

    // Run and wait
    await runSingleZImage(event, args, executablePath, executableDir)

    // If stopped during execution, break
    if (isBatchStopped)
      break
  }

  // Final Close Event to reset frontend state
  event.sender.send(IpcChannelOn.COMMAND_CLOSE, 0)
}

export async function killZImageProcess(): Promise<void> {
  isBatchStopped = true
  if (zImageChild) {
    console.log('Killing ZImage process...')
    zImageChild.kill()
    zImageChild = null
  }
}
