import type { BrowserWindow } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IpcChannelOn } from '@shared/const/ipc'

let watcher: fs.FSWatcher | null = null
let watchedDirectory: string | null = null
let debounceTimer: NodeJS.Timeout | null = null
const detectedFiles = new Set<string>()

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

export function startWatchingDirectory(
  dirPath: string,
  mainWindow: BrowserWindow,
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
    // Frontend uses unshift so we want oldest -> newest so final array is [newest, ..., oldest]
    // Wait, if frontend unshifts, then we want to send OLDEST first, then NEWEST last.
    // Yes. So sort by time ascending.

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

    // Send existing images to frontend
    if (fileStats.length > 0) {
      console.log(`Sending ${fileStats.length} existing images to frontend`)
      fileStats.forEach((item) => {
        mainWindow.webContents.send(IpcChannelOn.NEW_IMAGE_DETECTED, item.path)
      })
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
        // Check if file exists and is not already detected
        if (fs.existsSync(pendingPath) && !detectedFiles.has(pendingPath)) {
          // Double check it's a valid file (not temp/partial)
          try {
            // For now just add it. Size check might be needed for very large files being written.
            detectedFiles.add(pendingPath)
            console.log(`New image detected: ${pendingPath}`)
            mainWindow.webContents.send(IpcChannelOn.NEW_IMAGE_DETECTED, pendingPath)
          }
          catch (e) {
            console.error(`Error processing new file ${pendingPath}:`, e)
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

export function stopWatchingDirectory(): void {
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
