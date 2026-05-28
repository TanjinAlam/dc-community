import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerHandlers, init, setWindow } from './ipc.js'

const DATA_PATH = process.env.DATA_PATH || './pear-social-data'

registerHandlers()

app.whenReady().then(async () => {
  await init(DATA_PATH)
  createWindow()
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  setWindow(win)
  if (process.env.NODE_ENV === 'development') win.webContents.openDevTools()
  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
