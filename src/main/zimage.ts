import type { ZImageOptions } from '@shared/type/zimage'
import type { IpcMainEvent } from 'electron'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { IpcChannelOn } from '@shared/const/ipc'

import { getCorePath } from './getCorePath'

let zImageChild: ChildProcessWithoutNullStreams | null = null

export async function getZImageModels(): Promise<string[]> {
  const corePath = getCorePath()
  const executableDir = join(corePath, '..') // .../FinalDream-core
  const modelsDir = join(executableDir, '..', 'models') // .../models

  try {
    const entries = await readdir(modelsDir, { withFileTypes: true })
    return entries
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
  }
  catch (error) {
    console.error('Failed to read models directory:', error)
    return []
  }
}

export async function runZImageCommand(event: IpcMainEvent, options: ZImageOptions): Promise<void> {
  const executablePath = getCorePath()

  // Construct arguments as an array (no quotes needed when passing to spawn directly)
  const args: string[] = []

  // -p prompt
  args.push('-p', options.prompt)

  // -n negative-prompt
  if (options.negativePrompt) {
    args.push('-n', options.negativePrompt)
  }

  // -o output-path
  if (options.output) {
    args.push('-o', normalize(options.output))
  }

  // -s image-size
  if (options.width && options.height) {
    args.push('-s', `${options.width},${options.height}`)
  }

  // -l steps
  if (options.steps && options.steps !== 'auto') {
    args.push('-l', `${options.steps}`)
  }

  // -r random-seed
  if (options.seed && options.seed !== 'rand') {
    args.push('-r', `${options.seed}`)
  }

  // -m model-path
  if (options.model) {
    const executableDir = join(executablePath, '..')
    const modelPath = join(executableDir, '..', 'models', options.model)
    args.push('-m', normalize(modelPath))
  }

  // -g gpu-id
  if (options.gpuId && options.gpuId !== 'auto') {
    args.push('-g', `${options.gpuId}`)
  }

  console.log('Executing ZImage:', executablePath, args)

  // kill previous instance if running? Maybe not, allow parallel?
  // User didn't specify, but typically single instance for GPU usage is safer.
  if (zImageChild) {
    try {
      zImageChild.kill()
    }
    catch {}
  }

  // Set working directory to the executable's directory
  // This allows the executable to find model files correctly
  const executableDir = join(executablePath, '..')

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
  })
}

export async function killZImageProcess(): Promise<void> {
  if (zImageChild) {
    console.log('Killing ZImage process...')
    zImageChild.kill()
    zImageChild = null
  }
}
