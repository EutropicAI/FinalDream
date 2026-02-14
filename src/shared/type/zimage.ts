export interface ZImageOptions {
  prompt: string
  negativePrompt?: string
  output?: string
  width?: number
  height?: number
  steps?: number | 'auto'
  seed?: number | 'rand'
  model?: string
  gpuId?: number | 'auto'
}
