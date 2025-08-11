// scanner-bridge/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const scanner = require('scanner-library'); // You'll need a proper scanner library

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({ width: 800, height: 600 });
  mainWindow.loadFile('index.html');
  
  // Scanner API
  ipcMain.handle('get-scanners', async () => {
    return await scanner.getDevices();
  });
  
  ipcMain.handle('scan', async (event, { scannerId, settings }) => {
    return await scanner.scan(scannerId, settings);
  });
}

app.whenReady().then(createWindow);