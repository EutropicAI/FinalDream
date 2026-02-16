import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { IpcChannelInvoke, IpcChannelSend } from '@shared/const/ipc'
import { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import appIcon from '../../resources/icon.png?asset'
import trayIcon from '../../resources/tray.png?asset'
import { startWatchingDirectory, stopWatchingDirectory } from './fileWatcher'
import { copyImage } from './imageUtils'
import { checkModelStatus, downloadModels } from './modelManager'
import { openDirectory } from './openDirectory'
import { getZImageModels, killZImageProcess, runZImageCommand } from './zimage'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    maxWidth: 1920,
    minWidth: 800,
    maxHeight: 1080,
    minHeight: 600,
    frame: true,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    icon: nativeImage.createFromPath(appIcon),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Allow loading local files
    },
  })

  if (process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createFromPath(appIcon))
  }

  // Ipc events
  ipcMain.on(IpcChannelSend.ZIMAGE_EXECUTE_COMMAND, runZImageCommand)
  ipcMain.on(IpcChannelSend.KILL_COMMAND, killZImageProcess)

  ipcMain.handle(IpcChannelInvoke.OPEN_DIRECTORY_DIALOG, openDirectory)
  ipcMain.handle(IpcChannelInvoke.ZIMAGE_GET_MODELS, getZImageModels)

  // Model Manager IPC
  ipcMain.handle(IpcChannelInvoke.CHECK_MODEL_STATUS, checkModelStatus)
  ipcMain.handle(IpcChannelInvoke.DOWNLOAD_MODEL, downloadModels)

  // File watcher handlers
  ipcMain.handle(IpcChannelInvoke.START_WATCHING_DIRECTORY, startWatchingDirectory)
  ipcMain.handle(IpcChannelInvoke.STOP_WATCHING_DIRECTORY, stopWatchingDirectory)

  // Clipboard handlers
  ipcMain.handle(IpcChannelInvoke.COPY_IMAGE, copyImage)

  // Window handlers
  ipcMain.on(IpcChannelSend.MINIMIZE, () => {
    mainWindow.minimize()
  })

  ipcMain.on(IpcChannelSend.MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore()
    }
    else {
      mainWindow.maximize()
    }
  })

  ipcMain.on(IpcChannelSend.CLOSE, () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
    else {
      app.hide()
    }
  })

  // mainWindow
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  }
  else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

let tray
function setTray(): void {
  const Image = nativeImage.createFromPath(trayIcon)
  Image.setTemplateImage(true)
  tray = new Tray(Image)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: (): void => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow()
        }
        else {
          BrowserWindow.getAllWindows()[0].show()
        }
      },
    },
    {
      label: 'Exit',
      click: (): void => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('FinalDream')
  tray.setContextMenu(contextMenu)
}

// disable hardware acceleration for Compatibility for windows
app.disableHardwareAcceleration()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.finaldream.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setTray()
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopWatchingDirectory()
    killZImageProcess()
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let isQuitting = false
app.on('before-quit', async (event) => {
  if (isQuitting) {
    console.log('Quitting...')
    return
  }
  console.log('Killing child process before quitting...')
  event.preventDefault()
  isQuitting = true
  await killZImageProcess()
  app.quit()
})
