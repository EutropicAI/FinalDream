import type { ZImageModelDownloadProgress } from '@shared/type/zimage'
import type { IpcMainInvokeEvent } from 'electron'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IpcChannelOn } from '@shared/const/ipc'

const BASE_URL = 'https://modelscope.cn/api/v1/models/Tohrusky/z-image-turbo-ncnn/repo?Revision=master&FilePath='

// Define the file list with expected hashes
interface ModelFile { name: string, hash: string }

export const PRESET_MODELS: Record<string, ModelFile[]> = {
  'z-image-turbo': [
    { name: 'merges.txt', hash: '0de0bc38a29ea38eef099b677fa1ff52edd181e573529af26c4cd2136e233777' },
    { name: 'vocab.txt', hash: '6b3cf6583d96d9ed8afe6baf95385002fe355ba15ef5c76081a4bbd564c0c112' },
    { name: 'z_image_turbo_text_encoder.ncnn.bin', hash: 'd05f6442e019311e5742c3d0a00e48d4f27bedfe5e32d82483536c427b1169a3' },
    { name: 'z_image_turbo_text_encoder.ncnn.param', hash: 'b7c4dca55ef07d6c63fc049c70ac434b8f0637588d9022318b33bc65312d82a2' },
    { name: 'z_image_turbo_transformer_all_final_layer.ncnn.bin', hash: '812a0b0d09e9e5df0e536fa3de35387a2e6eac862a34242e73f97a3c1612a904' },
    { name: 'z_image_turbo_transformer_all_final_layer.ncnn.param', hash: '4488e4e204071325755b8b4667e377e7fdbd33575f77d5335edcb8583d4434c3' },
    { name: 'z_image_turbo_transformer_all_x_embedder.ncnn.bin', hash: 'b0847e5dcf43493c7297c17a252ee0d0754c82eebf24ad8771a21c18e978eeb8' },
    { name: 'z_image_turbo_transformer_all_x_embedder.ncnn.param', hash: 'c443890d2e2e500f2e00a7d224637ffd5de687349f31df1f77d3e15667ad9d65' },
    { name: 'z_image_turbo_transformer_cap_embedder.ncnn.bin', hash: 'f2698b2f2d3e27c243e7ab4aea907e67bf3a67c456d1df4bd7d4538d2db7eb0c' },
    { name: 'z_image_turbo_transformer_cap_embedder.ncnn.param', hash: 'de682637f82faa64ff06d519e204d20638e2b54b74e5a4b511b646aa2d0de7b6' },
    { name: 'z_image_turbo_transformer_context_refiner.ncnn.bin', hash: '282e4f405fcef10d68a8dbb2f98acb7e9df3ebbb753680c810afb971449babc6' },
    { name: 'z_image_turbo_transformer_context_refiner.ncnn.param', hash: '733a6699fb71bfacfcf95067c51898c2bdee3432dcfe15315300f08374c4358f' },
    { name: 'z_image_turbo_transformer_noise_refiner.ncnn.bin', hash: 'a7551d2a111629d9acbc700a2e227fc149756bcb78876bfc20ec91f0a71d448c' },
    { name: 'z_image_turbo_transformer_noise_refiner.ncnn.param', hash: 'edf024b5db5f7d2ddf070730e38206c5dc8d59a81738d7b302655a65eb64c771' },
    { name: 'z_image_turbo_transformer_t_embedder.ncnn.bin', hash: '767dd2f15c30b338d7b4c11d60cccbfa168d289342d9e59cec23acd8d33167d9' },
    { name: 'z_image_turbo_transformer_t_embedder.ncnn.param', hash: 'c8f95f56f405d887bcf32a84a6a31849226431ae8c836ee2a1d357457f8bb3d3' },
    { name: 'z_image_turbo_transformer_unified.ncnn.bin', hash: '2679209399fd9e9347d28ac0111b5364d2f90cf4920d53193f38f8d12259ef8e' },
    { name: 'z_image_turbo_transformer_unified.ncnn.param', hash: '7bbfee1ebf4ee67b10cafbf9a9d5cf3d0d2e7ef5785c8b6983ecf02ab15cd875' },
    { name: 'z_image_turbo_vae.ncnn.bin', hash: 'c2e75324fc9912f0c8b2d88c18e97f9a165e15d33a2d1d551a8e20db8c9e893e' },
    { name: 'z_image_turbo_vae.ncnn.param', hash: '1fe834872e7fd4ab537d2e3cdd8451f974ab3d0fb25e22bf1f406c2ea62eb74a' },
  ],
}

// Calculate SHA256 of a file
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

// Check status of all files
export async function checkModelStatus(
  _event: IpcMainInvokeEvent,
  modelName = 'z-image-turbo',
  fastCheck = true,
  customModelDir?: string,
): Promise<{ valid: boolean, missingFiles: string[] }> {
  // Ensure model exists in presets
  const requiredFiles = PRESET_MODELS[modelName]
  if (!requiredFiles) {
    return { valid: false, missingFiles: [] }
  }

  // Model dir is now required
  if (!customModelDir) {
    console.error('checkModelStatus: customModelDir is required')
    return { valid: false, missingFiles: requiredFiles.map(f => f.name) }
  }

  const modelDir = path.join(customModelDir, modelName)

  if (!fs.existsSync(modelDir)) {
    return { valid: false, missingFiles: requiredFiles.map(f => f.name) }
  }

  const missingFiles: string[] = []

  for (const file of requiredFiles) {
    const filePath = path.join(modelDir, file.name)
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file.name)
      continue
    }

    // Skip hash check in fast mode
    if (!fastCheck) {
      try {
        const hash = await calculateFileHash(filePath)
        if (hash !== file.hash) {
          console.warn(`Hash mismatch for ${file.name}: expected ${file.hash}, got ${hash}`)
          missingFiles.push(file.name)
        }
      }
      catch (e) {
        console.error(`Error checking hash for ${file.name}:`, e)
        missingFiles.push(file.name)
      }
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles,
  }
}

// Download a single file using standard fetch (Node 18+)
async function downloadFile(
  fileName: string,
  targetDir: string,
  onProgress: (downloaded: number, total: number) => void,
): Promise<void> {
  const url = `${BASE_URL}${fileName}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download ${fileName}: ${response.statusText}`)
  }

  const totalLength = Number(response.headers.get('content-length')) || 0
  if (totalLength === 0) {
    // Some servers might not send content-length, or it might be compressed
    console.warn(`Content-length missing for ${fileName}`)
  }

  const reader = response.body?.getReader()
  if (!reader)
    throw new Error(`Failed to get reader for ${fileName}`)

  const targetPath = path.join(targetDir, fileName)
  const tempPath = `${targetPath}.tmp`
  const writeStream = fs.createWriteStream(tempPath)

  let receivedLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    writeStream.write(Buffer.from(value))
    receivedLength += value.length
    if (totalLength > 0) {
      onProgress(receivedLength, totalLength)
    }
  }

  writeStream.end()

  // Wait for stream to finish
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  // Rename to final filename
  fs.renameSync(tempPath, targetPath)
}

// Main download function exposed to IPC
export async function downloadModels(
  _event: IpcMainInvokeEvent,
  modelName = 'z-image-turbo',
  missingFiles: string[] = [],
  customModelDir?: string,
): Promise<{ success: boolean, error?: string }> {
  const requiredFiles = PRESET_MODELS[modelName]
  if (!requiredFiles) {
    return { success: false, error: `Unknown model: ${modelName}` }
  }

  // Model dir is now required
  if (!customModelDir) {
    return { success: false, error: 'Model directory is not selected.' }
  }

  const modelDir = path.join(customModelDir, modelName)

  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true })
  }

  let filesToDownload = requiredFiles
  if (missingFiles.length > 0) {
    filesToDownload = requiredFiles.filter(f => missingFiles.includes(f.name))
  }

  try {
    for (const [index, file] of filesToDownload.entries()) {
      console.log(`Downloading ${file.name} (${index + 1}/${filesToDownload.length})...`)

      // Notify start of this file
      const progressData: ZImageModelDownloadProgress = {
        file: file.name,
        progress: 0,
        currentFileIndex: index + 1,
        totalFiles: filesToDownload.length,
      }
      _event.sender.send(IpcChannelOn.MODEL_DOWNLOAD_PROGRESS, progressData)

      await downloadFile(file.name, modelDir, (downloaded, total) => {
        const percentage = total > 0 ? (downloaded / total) * 100 : 0

        const progressData: ZImageModelDownloadProgress = {
          file: file.name,
          progress: percentage,
          currentFileIndex: index + 1,
          totalFiles: filesToDownload.length,
        }
        _event.sender.send(IpcChannelOn.MODEL_DOWNLOAD_PROGRESS, progressData)
      })

      // Verify hash immediately after download
      const targetPath = path.join(modelDir, file.name)
      const hash = await calculateFileHash(targetPath)
      if (hash !== file.hash) {
        fs.unlinkSync(targetPath) // Delete invalid file
        throw new Error(`Hash mismatch for downloaded file: ${file.name}`)
      }

      console.log(`Verified ${file.name}`)
    }

    return { success: true }
  }
  catch (error) {
    console.error('Download failed:', error)
    return { success: false, error: String(error) }
  }
}
