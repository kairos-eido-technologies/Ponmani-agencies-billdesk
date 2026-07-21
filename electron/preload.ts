import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getBackupDir: () => ipcRenderer.invoke('backup:get-dir'),
  printReceipt: (htmlContent: string) => ipcRenderer.invoke('printer:print-receipt', htmlContent),
});
