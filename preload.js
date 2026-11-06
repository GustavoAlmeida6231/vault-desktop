'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// O site detecta o app por window.vaultDesktop: atalhos globais e atualização automática
contextBridge.exposeInMainWorld('vaultDesktop', {
  isDesktop: true,
  platform: process.platform,
  onShortcut(cb) {
    const handler = (_event, action) => cb(action);
    ipcRenderer.on('vault:shortcut', handler);
    return () => ipcRenderer.removeListener('vault:shortcut', handler);
  },
  // { status: 'idle' | 'downloading' | 'ready', version?, percent? }
  onUpdate(cb) {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on('vault:update', handler);
    ipcRenderer.invoke('vault:update-state').then(cb).catch(() => {});
    return () => ipcRenderer.removeListener('vault:update', handler);
  },
  installUpdate() {
    ipcRenderer.send('vault:install-update');
  },
  // Clique numa notificação: traz a janela do Vault para a frente (mesmo escondida na bandeja)
  showWindow() {
    ipcRenderer.send('vault:show-window');
  },
});
