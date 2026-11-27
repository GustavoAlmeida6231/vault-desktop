'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picker', {
  getSources: () => ipcRenderer.invoke('picker:sources'),
  choose: (id, audio, name) => ipcRenderer.send('picker:choose', { id, audio, name }),
  cancel: () => ipcRenderer.send('picker:choose', null),
});
