import type { ZImageOptions } from '@shared/type/zimage'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, normalize } from 'node:path'

import { IpcChannelOn } from '@shared/const/ipc'
import kill from 'tree-kill'

import { getCorePath } from './getPath'
import { PRESET_MODELS } from './modelManager'

let zImageChild: ChildProcessWithoutNullStreams | null = null
let isBatchStopped = false

export async function getZImageModels(_event: IpcMainInvokeEvent, customModelDir?: string): Promise<string[]> {
  const corePath = getCorePath()
  const executableDir = join(corePath, '..') // .../FinalDream-core

  // Validation for custom dir
  if (customModelDir && !existsSync(customModelDir)) {
    throw new Error('DIRECTORY_NOT_FOUND')
  }

  // Use custom dir or default
  const modelsDir = customModelDir || join(executableDir, '..', 'models') // .../models

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

async function runSingleZImage(_event: IpcMainEvent, args: string[], executablePath: string): Promise<number> {
  return new Promise((resolve) => {
    zImageChild = spawn(executablePath, args, {
      shell: true,
    })

    zImageChild.stdout.on('data', (data) => {
      _event.sender.send(IpcChannelOn.COMMAND_STDOUT, data.toString())
    })

    zImageChild.stderr.on('data', (data) => {
      _event.sender.send(IpcChannelOn.COMMAND_STDERR, data.toString())
    })

    zImageChild.on('close', (code) => {
      console.log(`ZImage process exited with code: ${code}`)
      zImageChild = null
      resolve(code ?? 0)
    })

    zImageChild.on('error', (err) => {
      _event.sender.send(IpcChannelOn.COMMAND_STDERR, err.toString())
      console.error('Failed to start subprocess:', err)
      zImageChild = null
      resolve(-1)
    })
  })
}

export async function runZImageCommand(_event: IpcMainEvent, options: ZImageOptions): Promise<void> {
  isBatchStopped = false

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
    const outputPath = join(normalize(options.outputFolder), filename)

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
      const modelPath = join(options.modelDir, options.model)
      args.push('-m', normalize(modelPath))
    }

    if (options.gpuId && options.gpuId !== 'auto') {
      args.push('-g', `${options.gpuId}`)
    }

    const current_start_args = `[Batch ${i + 1}/${count}] Executing ZImage: ${getCorePath()} ${args.join(' ')} \n\n`
    console.log(current_start_args)
    _event.sender.send(IpcChannelOn.COMMAND_STDOUT, current_start_args)

    // Run and wait
    await runSingleZImage(_event, args, getCorePath())

    // If stopped during execution, break
    if (isBatchStopped)
      break
  }

  // Final Close Event to reset frontend state
  _event.sender.send(IpcChannelOn.COMMAND_CLOSE, 0)
}

export async function killZImageProcess(_event?: IpcMainEvent): Promise<void> {
  isBatchStopped = true
  if (!zImageChild || !zImageChild.pid) {
    console.log('ZImage process not running or no PID found.')
    return
  }

  const pid = zImageChild.pid
  console.log(`Killing ZImage process tree with PID: ${pid}`)

  return new Promise<void>((resolve) => {
    kill(pid, 'SIGKILL', (err) => {
      if (err) {
        console.error(`Failed to kill process tree: ${err.message}`)
      }
      else {
        console.log('ZImage process tree killed successfully')
      }

      // Ensure reference is cleared if it matches
      if (zImageChild && zImageChild.pid === pid) {
        zImageChild = null
      }
      resolve()
    })
  })
}
