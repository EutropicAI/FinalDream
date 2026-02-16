export interface ZImageOptions {
  prompt: string
  negativePrompt?: string
  outputFolder: string
  width?: number
  height?: number
  steps?: number | 'auto'
  seed?: number | 'rand'
  model?: string
  gpuId?: number | 'auto'
  count?: number
  modelDir: string
}

export interface ZImageModelDownloadProgress {
  file: string
  progress: number
  currentFileIndex: number
  totalFiles: number
}
