import type { IpcMainInvokeEvent } from 'electron'
import { clipboard, nativeImage } from 'electron'

export async function copyImage(_event: IpcMainInvokeEvent, imagePath: string): Promise<{ success: boolean, error?: string }> {
  try {
    const image = nativeImage.createFromPath(imagePath)
    clipboard.writeImage(image)
    return { success: true }
  }
  catch (error) {
    console.error('Failed to copy image:', error)
    return { success: false, error: String(error) }
  }
}
