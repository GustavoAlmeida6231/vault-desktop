'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Versão do app (vem do main.js por additionalArguments)
const versionArg = (process.argv || []).find((a) => typeof a === 'string' && a.startsWith('--vault-version='));
const version = versionArg ? versionArg.slice('--vault-version='.length) : '';

// O site detecta o app por window.vaultDesktop: atalhos globais e atualização automática
contextBridge.exposeInMainWorld('vaultDesktop', {
  isDesktop: true,
  platform: process.platform,
  version,
  // O que este app sabe fazer (o site confere antes de usar algo novo)
  features: ['shortcuts', 'update', 'showWindow', 'callState', 'flash', 'leave', 'zoom'],
  // action: 'mute' | 'deafen' | 'leave'
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
  // O site avisa quando está numa chamada: o PC não dorme e a bandeja mostra mutar/sair
  setCallState(state) {
    const s = state && typeof state === 'object' ? state : {};
    ipcRenderer.send('vault:call-state', {
      inCall: Boolean(s.inCall),
      muted: Boolean(s.muted),
      deafened: Boolean(s.deafened),
      channel: typeof s.channel === 'string' ? s.channel : '',
    });
  },
  // Mensagem nova com o Vault em segundo plano: pisca o ícone na barra de tarefas
  flash() {
    ipcRenderer.send('vault:flash');
  },
});
