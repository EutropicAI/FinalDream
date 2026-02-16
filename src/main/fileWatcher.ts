import type { IpcMainInvokeEvent } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IpcChannelOn } from '@shared/const/ipc'

let watcher: fs.FSWatcher | null = null
let watchedDirectory: string | null = null
let debounceTimer: NodeJS.Timeout | null = null
// Store the sender to send updates back to the renderer
const detectedFiles = new Set<string>()

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

export function startWatchingDirectory(
  _event: IpcMainInvokeEvent,
  dirPath: string,
): void {
  // Stop any existing watcher
  stopWatchingDirectory()

  if (!fs.existsSync(dirPath)) {
    console.error(`Directory does not exist: ${dirPath}`)
    return
  }

  watchedDirectory = dirPath
  console.log(`Starting to watch directory: ${dirPath}`)

  // Scan existing files first and send them to frontend
  try {
    const existingFiles = fs.readdirSync(dirPath)
    console.log(`Found ${existingFiles.length} files in directory`)

    // Get stats and sort by mtime (oldest first)
    const fileStats = existingFiles
      .filter(file => isImageFile(file))
      .map((file) => {
        const fullPath = path.join(dirPath, file)
        try {
          const stats = fs.statSync(fullPath)
          return { path: fullPath, mtime: stats.mtimeMs }
        }
        catch {
          return null
        }
      })
      .filter((item): item is { path: string, mtime: number } => item !== null)
      .sort((a, b) => a.mtime - b.mtime)

    // Add to detected set
    fileStats.forEach(item => detectedFiles.add(item.path))

    // Send existing images to frontend in a single batch
    if (fileStats.length > 0 && !_event.sender.isDestroyed()) {
      console.log(`Sending ${fileStats.length} existing images to frontend (batch)`)
      _event.sender.send(IpcChannelOn.BATCH_IMAGES_DETECTED, fileStats)
    }
  }
  catch (error) {
    console.error('Error reading directory:', error)
  }

  // Watch for new files
  const pendingFiles = new Set<string>()

  watcher = fs.watch(dirPath, (_eventType, filename) => {
    if (!filename || !isImageFile(filename))
      return

    const fullPath = path.join(dirPath, filename)

    // Add to pending set
    pendingFiles.add(fullPath)

    // Debounce processing
    if (debounceTimer)
      clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      // Process all pending files
      pendingFiles.forEach((pendingPath) => {
        const fileExists = fs.existsSync(pendingPath)
        const isDetected = detectedFiles.has(pendingPath)

        // Case 1: File Added (Exists AND Not Detected)
        if (fileExists && !isDetected) {
          try {
            const stats = fs.statSync(pendingPath)
            detectedFiles.add(pendingPath)
            console.log(`New image detected: ${pendingPath}`)
            if (!_event.sender.isDestroyed()) {
              _event.sender.send(IpcChannelOn.NEW_IMAGE_DETECTED, {
                path: pendingPath,
                mtime: stats.mtimeMs,
              })
            }
          }
          catch (e) {
            console.error(`Error processing new file ${pendingPath}:`, e)
          }
        }
        // Case 2: File Removed (Does Not Exist AND Detected)
        else if (!fileExists && isDetected) {
          try {
            detectedFiles.delete(pendingPath)
            console.log(`Image removed: ${pendingPath}`)
            if (!_event.sender.isDestroyed()) {
              _event.sender.send(IpcChannelOn.IMAGE_REMOVED, pendingPath)
            }
          }
          catch (e) {
            console.error(`Error processing removed file ${pendingPath}:`, e)
          }
        }
      })
      // Clear pending set after processing
      pendingFiles.clear()
    }, 100) // 100ms debounce
  })

  watcher.on('error', (error) => {
    console.error('File watcher error:', error)
  })
}

export function stopWatchingDirectory(_event?: IpcMainInvokeEvent): void {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log(`Stopped watching directory: ${watchedDirectory}`)
  }
  watchedDirectory = null
  detectedFiles.clear()
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

export function getWatchedDirectory(): string | null {
  return watchedDirectory
}
