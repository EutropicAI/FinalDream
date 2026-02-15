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

    const imageFiles: string[] = []
    existingFiles.forEach((file) => {
      if (isImageFile(file)) {
        const fullPath = path.join(dirPath, file)
        detectedFiles.add(fullPath)
        imageFiles.push(fullPath)
      }
    })

    // Send existing images to frontend
    if (imageFiles.length > 0) {
      console.log(`Sending ${imageFiles.length} existing images to frontend`)
      imageFiles.forEach((imagePath) => {
        mainWindow.webContents.send(IpcChannelOn.NEW_IMAGE_DETECTED, imagePath)
      })
    }
  }
  catch (error) {
    console.error('Error reading directory:', error)
  }

  // Watch for new files
  watcher = fs.watch(dirPath, (_eventType, filename) => {
    if (!filename || !isImageFile(filename))
      return

    const fullPath = path.join(dirPath, filename)

    // Debounce to avoid duplicate events
    if (debounceTimer)
      clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      // Check if file exists and is not already detected
      if (fs.existsSync(fullPath) && !detectedFiles.has(fullPath)) {
        detectedFiles.add(fullPath)
        console.log(`New image detected: ${fullPath}`)
        mainWindow.webContents.send(IpcChannelOn.NEW_IMAGE_DETECTED, fullPath)
      }
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
