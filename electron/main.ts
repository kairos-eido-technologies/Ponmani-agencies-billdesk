import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fork, ChildProcess } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maximum Desktop GPU & CPU Acceleration Switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function waitForServer(url: string, retries = 60, delay = 50): Promise<void> {
  return new Promise((resolve) => {
    let attempted = 0;
    const check = () => {
      attempted++;
      const req = http.get(url, (res) => {
        if (res.statusCode) {
          resolve();
        } else if (attempted < retries) {
          setTimeout(check, delay);
        } else {
          resolve();
        }
      });
      req.on('error', () => {
        if (attempted < retries) {
          setTimeout(check, delay);
        } else {
          resolve();
        }
      });
    };
    check();
  });
}

function startServerProcess(): Promise<string> {
  return new Promise(async (resolve) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      await waitForServer(devServerUrl);
      resolve(devServerUrl);
      return;
    }

    const appPath = app.getAppPath();
    const candidatePaths = [
      path.join(appPath, '.output/server/index.mjs'),
      path.join(__dirname, '../../.output/server/index.mjs'),
      path.join(__dirname, '../.output/server/index.mjs'),
    ];

    const targetPath = candidatePaths.find((p) => fs.existsSync(p));

    if (targetPath) {
      console.log('Loading Nitro production server:', targetPath);
      process.env.PORT = '3000';
      process.env.HOST = '127.0.0.1';
      try {
        await import(pathToFileURL(targetPath).href);
      } catch (err) {
        console.error('Direct import failed, falling back to process fork:', err);
        serverProcess = fork(targetPath, [], {
          env: { ...process.env, PORT: '3000', HOST: '127.0.0.1', ELECTRON_RUN_AS_NODE: '1' },
        });
      }
    } else {
      console.error('Nitro production server file not found in candidates:', candidatePaths);
    }

    await waitForServer('http://127.0.0.1:3000');
    resolve('http://127.0.0.1:3000');
  });
}

async function createWindow() {
  const iconPath = path.join(app.getAppPath(), 'public/ponmani-logo-icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    title: 'Ponmani Agencies Console ERP',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: iconPath,
    backgroundColor: '#16181D',
  });

  mainWindow.setMenu(null);
  mainWindow.maximize();

  const targetUrl = await startServerProcess();
  await mainWindow.loadURL(targetUrl);
  mainWindow.show();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

// IPC Communication Handlers
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('backup:get-dir', () => {
  const backupDir = path.join(app.getPath('userData'), 'Backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
});

ipcMain.handle('printer:print-receipt', async () => {
  if (mainWindow) {
    mainWindow.webContents.print({ silent: false, printBackground: true });
  }
  return { success: true };
});
