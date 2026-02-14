import path from 'node:path'
import { app } from 'electron'

const ZIMAGE_CORE_PATH = 'FinalDream-core/zimage-ncnn-vulkan'

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

// Export a dummy checkPipPackage to satisfy test import if needed, or remove the test.
// I will remove the test as it's not relevant.
