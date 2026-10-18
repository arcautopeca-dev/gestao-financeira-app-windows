const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('db:load'), save: d => ipcRenderer.invoke('db:save', d),
  saveText: o => ipcRenderer.invoke('file:saveText', o), openText: () => ipcRenderer.invoke('file:openText'),
  openExternal: u => ipcRenderer.invoke('open:external', u)
});
