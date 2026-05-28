export const ipcMain = { handle: () => {} }
export const ipcRenderer = {}
export const contextBridge = { exposeInMainWorld: () => {} }
export const app = { whenReady: () => Promise.resolve(), on: () => {}, quit: () => {} }
export const BrowserWindow = class { loadURL() {} loadFile() {} webContents = { send: () => {} } }
