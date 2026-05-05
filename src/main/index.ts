import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle(
    'audio:blob',
    async (
      _event,
      payload: { data: ArrayBuffer; mimeType: string; filename?: string }
    ): Promise<{ ok: boolean; status: number; bodyPreview: string }> => {
      const url = import.meta.env.MAIN_VITE_AUDIO_UPLOAD_URL
      if (!url) {
        throw new Error('Set MAIN_VITE_AUDIO_UPLOAD_URL in .env (e.g. https://httpbin.org/post)')
      }

      const blob = new Blob([payload.data], {
        type: payload.mimeType || 'application/octet-stream'
      })
      const form = new FormData()
      form.append('file', blob, payload.filename ?? 'audio')

      const res = await fetch(url, { method: 'POST', body: form })
      const text = await res.text()
      console.log('[audio:blob] upload', { status: res.status, url, bytes: payload.data.byteLength })
      console.log('[audio:blob] response body (truncated)', text.slice(0, 2000))

      return { ok: res.ok, status: res.status, bodyPreview: text.slice(0, 500) }
    }
  )



  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
