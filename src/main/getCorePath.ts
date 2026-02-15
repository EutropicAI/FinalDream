import path from 'node:path'
import { app } from 'electron'

const ZIMAGE_CORE_PATH = 'FinalDream-core/zimage-ncnn-vulkan'
const MODELS_DIR = 'models'

/**
 * Get ZImage core path
 * @returns {string} Path to zimage-ncnn-vulkan executable
 */
export function getCorePath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(app.getAppPath(), 'resources', ZIMAGE_CORE_PATH)
  }
  else {
    return path.join(app.getAppPath(), '..', ZIMAGE_CORE_PATH)
  }
}

/**
 * Get model directory
 * @returns {string} Path to model directory
 */
export function getModelDir(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(app.getAppPath(), 'resources', MODELS_DIR)
  }
  else {
    return path.join(app.getAppPath(), '..', MODELS_DIR)
  }
}
