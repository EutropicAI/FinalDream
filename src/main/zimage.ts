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
  // Assumes models are in a 'models' subdirectory relative to the core executable
  // Based on user request: "模型放在zimage-ncnn-vulkan/models"
  // And core path logic likely points to the executable or the dir containing it.
  // We need to double check getCorePath implementation or assume check two levels.
  // Actually, getCorePath in runCommand.ts returns the executable path.
  // So we need to dirname it.
  // getCorePath returns path to executable: .../FinalDream-core/zimage-ncnn-vulkan
  // models are now in .../models (sibling to FinalDream-core)
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

export interface ZImageOptions {
  prompt: string
  negativePrompt?: string
  output?: string
  width?: number
  height?: number
  steps?: number | 'auto'
  seed?: number | 'rand'
  model?: string
  gpuId?: number
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
  // User said models are in zimage-ncnn-vulkan/models
  // And the README says "Download ... to the same directory as the executable file"
  // But typically -m takes a path.
  // If we pass just the model name, does it look in current dir?
  // Let's assume we pass the full path or relative path to the executable.
  if (options.model) {
    // We assume the model is a folder name in the models directory
    // Models are in ../models relative to the executable's directory
    const executableDir = join(executablePath, '..')
    const modelPath = join(executableDir, '..', 'models', options.model)
    args.push('-m', normalize(modelPath))
  }

  // -g gpu-id
  if (options.gpuId !== undefined) {
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
    cwd: executableDir
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
