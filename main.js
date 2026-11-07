'use strict';

/**
 * Vault para Windows.
 * Abre o Vault (o mesmo site da Vercel) num Chromium próprio, com:
 *  - seletor de tela/janela com o som do computador (sem eco da própria chamada no Windows 11)
 *  - aceleração por hardware e sem "economia" quando a janela fica em segundo plano
 *  - atalhos globais: Ctrl+Shift+M (mutar) e Ctrl+Shift+D (ensurdecer)
 *  - fechar a janela só esconde: o Vault continua na bandeja (perto do relógio), igual ao Discord
 *  - atualização automática: baixa sozinho a versão nova e mostra o ícone verde no canto superior esquerdo
 */

const { app, BrowserWindow, Menu, Tray, desktopCapturer, globalShortcut, ipcMain, nativeImage, powerMonitor, session, shell } = require('electron');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const os = require('os');
const path = require('path');

const APP_URL = process.env.VAULT_URL || 'https://vault-omega-cyan.vercel.app';
const APP_ORIGIN = new URL(APP_URL).origin;

/* ---------------- desempenho ---------------- */
// Não deixa o Windows/Chromium "economizar" a chamada quando o Vault fica atrás do jogo ou minimizado
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// Usa a placa de vídeo dedicada (notebooks com duas GPUs) e libera o encoder de hardware
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (process.platform === 'win32') app.setAppUserModelId('app.vault.desktop');

/** Windows 11 (build 22000+) consegue tirar o som do próprio Vault do áudio compartilhado. */
function canExcludeOwnAudio() {
  if (process.platform !== 'win32') return false;
  const build = Number(String(os.release()).split('.')[2] || 0);
  return build >= 22000;
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

let mainWindow = null;
let picker = null; // { win, resolve, audioRequested }
let tray = null;
let retryTimer = null;
let retryDelay = 3000;
let isQuitting = false; // só fica true quando o usuário escolhe "Sair do Vault"
// Aberto pelo Windows ao ligar o PC: fica só na bandeja, sem abrir a janela (as notificações já funcionam)
const startedHidden = process.argv.includes('--hidden') || (process.platform === 'win32' && app.getLoginItemSettings().wasOpenedAtLogin);

function launchAtLoginEnabled() {
  try {
    const flag = path.join(app.getPath('userData'), 'no-autostart');
    return !fs.existsSync(flag);
  } catch {
    return true;
  }
}
function applyLaunchAtLogin() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  app.setLoginItemSettings({ openAtLogin: launchAtLoginEnabled(), args: ['--hidden'] });
}
function toggleLaunchAtLogin() {
  const flag = path.join(app.getPath('userData'), 'no-autostart');
  try {
    if (launchAtLoginEnabled()) fs.writeFileSync(flag, '1');
    else fs.unlinkSync(flag);
  } catch {}
  applyLaunchAtLogin();
  buildTrayMenu();
}

// No Windows o .ico tem cada tamanho desenhado à parte (16, 24, 32...), então fica nítido na bandeja e na barra de tarefas
const ICON_PATH = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

/** Estado da atualização que o site mostra no canto superior esquerdo. */
let updateState = { status: 'idle' }; // idle | downloading | ready

/* ---------------- janela principal ---------------- */

function offlinePage() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Vault</title>
  <style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0d10;color:#e5e7eb;font-family:Segoe UI,system-ui,sans-serif}
  .c{text-align:center}h1{font-size:22px;margin:0 0 8px}p{color:#9ca3af;margin:0 0 20px}
  a{display:inline-block;padding:10px 22px;border-radius:12px;background:#16a34a;color:#fff;text-decoration:none;font-weight:600}</style></head>
  <body><div class="c"><h1>Sem conexão com o Vault</h1><p>Verifique sua internet e tente de novo.</p><a href="${APP_URL}">Tentar de novo</a></div></body></html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'Vault',
    backgroundColor: '#0b0d10',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!startedHidden) mainWindow.show();
  });
  // Clicar no X esconde a janela; a chamada e o chat continuam rodando na bandeja
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
    showTrayHintOnce();
  });
  // Windows desligando/reiniciando ou saindo da conta: deixa fechar de verdade
  mainWindow.on('query-session-end', () => {
    isQuitting = true;
  });
  mainWindow.on('session-end', () => {
    isQuitting = true;
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Links de fora do Vault abrem no navegador normal
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (originOf(url) === APP_ORIGIN) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  // Sem internet ao abrir (comum quando o app abre junto com o Windows, antes da rede subir) ou rede que caiu:
  // mostra o aviso e tenta de novo sozinho, a cada 3 s no começo e até 15 s depois, até conectar.
  mainWindow.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || originOf(url) !== APP_ORIGIN) return;
    mainWindow.loadURL(offlinePage());
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(APP_URL);
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15_000);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    if (originOf(mainWindow.webContents.getURL()) === APP_ORIGIN) retryDelay = 3000;
  });
  // O Chromium da página travou ou foi encerrado: recarrega em vez de deixar a janela em branco
  mainWindow.webContents.on('render-process-gone', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(APP_URL);
    }, 1000);
  });

  // F5 recarrega, F11 tela cheia, Ctrl+Shift+I abre o console (para diagnóstico)
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') {
      mainWindow.webContents.reload();
      e.preventDefault();
    } else if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      e.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  mainWindow.loadURL(APP_URL);
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

/* ---------------- bandeja (perto do relógio) ---------------- */

/** Avisa uma única vez que o Vault continua aberto na bandeja. */
function showTrayHintOnce() {
  try {
    const flag = path.join(app.getPath('userData'), 'tray-hint-shown');
    if (fs.existsSync(flag)) return;
    fs.writeFileSync(flag, '1');
    if (tray && process.platform === 'win32') {
      tray.displayBalloon({
        iconType: 'info',
        title: 'O Vault continua aberto',
        content: 'Ele fica aqui perto do relógio. Clique no ícone para abrir ou com o botão direito para sair.',
      });
    }
  } catch {}
}

function buildTrayMenu() {
  if (!tray) return;
  const items = [{ label: 'Abrir o Vault', click: showWindow }];
  if (updateState.status === 'ready') {
    items.push({ label: `Reiniciar e atualizar para ${updateState.version}`, click: installUpdate });
  }
  items.push(
    { type: 'separator' },
    { label: 'Mutar / desmutar (Ctrl+Shift+M)', click: () => sendShortcut('mute') },
    { label: 'Ensurdecer (Ctrl+Shift+D)', click: () => sendShortcut('deafen') },
    { type: 'separator' },
    { label: 'Abrir o Vault ao ligar o computador', type: 'checkbox', checked: launchAtLoginEnabled(), click: toggleLaunchAtLogin },
    { label: `Versão ${app.getVersion()}`, enabled: false },
    { label: 'Procurar atualizações', click: () => checkForUpdates(true) },
    { label: 'Sair do Vault', click: quitApp },
  );
  tray.setContextMenu(Menu.buildFromTemplate(items));
  tray.setToolTip(updateState.status === 'ready' ? 'Vault (atualização pronta)' : 'Vault');
}

function createTray() {
  // Passa o arquivo direto: o Windows escolhe o tamanho certo do .ico conforme a escala da tela
  tray = new Tray(process.platform === 'win32' ? ICON_PATH : nativeImage.createFromPath(ICON_PATH).resize({ width: 32, height: 32, quality: 'best' }));
  buildTrayMenu();
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

/* ---------------- atualização automática ---------------- */

function setUpdateState(next) {
  updateState = next;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('vault:update', updateState);
  buildTrayMenu();
}

let lastManualCheck = false;
function checkForUpdates(manual = false) {
  if (!app.isPackaged) return;
  if (updateState.status === 'ready') {
    if (manual) showWindow();
    return;
  }
  lastManualCheck = manual;
  autoUpdater.checkForUpdates().catch((err) => console.warn('[vault] update check', err && err.message));
}

function installUpdate() {
  if (updateState.status !== 'ready') return;
  isQuitting = true;
  // silencioso (sem telas do instalador) e abre o Vault de novo depois
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
}

function setupUpdater() {
  if (!app.isPackaged) return; // rodando com "npm start": não procura atualização
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // se sair pela bandeja, instala na saída
  autoUpdater.on('update-available', (info) => setUpdateState({ status: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) =>
    setUpdateState({ status: 'downloading', version: updateState.version, percent: Math.round(p.percent || 0) }),
  );
  autoUpdater.on('update-downloaded', (info) => setUpdateState({ status: 'ready', version: info.version }));
  autoUpdater.on('update-not-available', () => {
    if (lastManualCheck && tray && process.platform === 'win32') {
      tray.displayBalloon({ iconType: 'info', title: 'Vault atualizado', content: `Você já está na versão mais nova (${app.getVersion()}).` });
    }
    lastManualCheck = false;
  });
  autoUpdater.on('error', (err) => {
    console.warn('[vault] update', err && err.message);
    if (updateState.status === 'downloading') setUpdateState({ status: 'idle' });
  });
  setTimeout(() => checkForUpdates(), 8_000); // logo depois de abrir
  setInterval(() => checkForUpdates(), 30 * 60 * 1000); // e a cada 30 minutos
}

ipcMain.handle('vault:update-state', (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return { status: 'idle' };
  return updateState;
});
ipcMain.on('vault:show-window', (event) => {
  if (mainWindow && event.sender === mainWindow.webContents) showWindow();
});
ipcMain.on('vault:install-update', (event) => {
  if (mainWindow && event.sender === mainWindow.webContents) installUpdate();
});

function sendShortcut(action) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('vault:shortcut', action);
}

/* ---------------- seletor de tela ---------------- */

function closePicker(choice) {
  if (!picker) return;
  const p = picker;
  picker = null;
  p.resolve(choice);
  if (!p.win.isDestroyed()) p.win.close();
}

function openPicker(audioRequested) {
  closePicker(null);
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 900,
      height: 640,
      minWidth: 640,
      minHeight: 480,
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      show: false,
      title: 'Compartilhar tela',
      backgroundColor: '#0b0d10',
      autoHideMenuBar: true,
      icon: ICON_PATH,
      webPreferences: {
        preload: path.join(__dirname, 'picker-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    picker = { win, resolve, audioRequested };
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => {
      if (picker && picker.win === win) {
        picker = null;
        resolve(null);
      }
    });
    win.loadFile(path.join(__dirname, 'picker.html'));
  });
}

function fromPicker(event) {
  return picker && !picker.win.isDestroyed() && event.sender === picker.win.webContents;
}

ipcMain.handle('picker:sources', async (event) => {
  if (!fromPicker(event)) return null;
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 400, height: 225 },
    fetchWindowIcons: true,
  });
  let pickerId = '';
  try {
    pickerId = picker.win.getMediaSourceId();
  } catch {}
  return {
    audioRequested: picker.audioRequested,
    audioSupported: process.platform === 'win32',
    excludesOwnAudio: canExcludeOwnAudio(),
    sources: sources
      .filter((s) => s.id !== pickerId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.startsWith('screen:') ? 'screen' : 'window',
        thumbnail: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : null,
        icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
      })),
  };
});

ipcMain.on('picker:choose', (event, choice) => {
  if (!fromPicker(event)) return;
  if (!choice || typeof choice.id !== 'string') return closePicker(null);
  closePicker({ id: choice.id, audio: Boolean(choice.audio) });
});

function setupSession() {
  const ses = session.defaultSession;
  const allowed = new Set(['media', 'display-capture', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'speaker-selection']);

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = originOf((details && details.requestingUrl) || wc.getURL());
    callback(origin === APP_ORIGIN && allowed.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return originOf(requestingOrigin) === APP_ORIGIN && allowed.has(permission);
  });

  // Quando o site pede getDisplayMedia, mostramos o nosso seletor (com o som do computador)
  ses.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        if (originOf(request.securityOrigin || (request.frame && request.frame.url) || '') !== APP_ORIGIN) return callback({});
        const choice = await openPicker(Boolean(request.audioRequested));
        if (!choice) return callback({});
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
        const source = sources.find((s) => s.id === choice.id);
        if (!source) return callback({});
        const result = { video: source };
        // "loopback" = som do computador. Com restrictOwnAudio (pedido pelo site) o Electron
        // troca para "loopback sem o Vault", então ninguém escuta o eco da própria voz.
        if (choice.audio && request.audioRequested && process.platform === 'win32') result.audio = 'loopback';
        callback(result);
      } catch (err) {
        console.error('[vault] display media', err);
        try {
          callback({});
        } catch {}
      }
    },
    { useSystemPicker: false },
  );
}

/* ---------------- atalhos globais ---------------- */

function setupShortcuts() {
  const map = { 'CommandOrControl+Shift+M': 'mute', 'CommandOrControl+Shift+D': 'deafen' };
  for (const [accel, action] of Object.entries(map)) {
    try {
      globalShortcut.register(accel, () => sendShortcut(action));
    } catch (err) {
      console.warn('[vault] atalho indisponível', accel, err);
    }
  }
}

/* ---------------- ciclo de vida ---------------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Abrir o Vault de novo (atalho da área de trabalho) só mostra a janela que já está rodando
  app.on('second-instance', () => showWindow());

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    setupSession();
    createWindow(); // a janela carrega o site mesmo escondida, então as notificações chegam na bandeja
    applyLaunchAtLogin();
    createTray();
    // PC voltando do repouso / tela desbloqueada: avisa o Vault para conferir mensagens e lançamentos
    // novos na hora (a conexão em tempo real costuma cair durante o repouso)
    const nudge = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      // preso na tela "Sem conexão": tenta abrir o Vault de novo agora
      if (originOf(mainWindow.webContents.getURL()) !== APP_ORIGIN) {
        retryDelay = 3000;
        mainWindow.loadURL(APP_URL);
        return;
      }
      mainWindow.webContents.executeJavaScript("window.dispatchEvent(new Event('online'))").catch(() => {});
    };
    powerMonitor.on('resume', () => setTimeout(nudge, 3000));
    powerMonitor.on('unlock-screen', nudge);
    setupShortcuts();
    setupUpdater();
    app.on('activate', showWindow);
  });

  // Desligar o Windows, atualizar o app etc.: aí sim fecha de verdade
  app.on('before-quit', () => {
    isQuitting = true;
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Com a janela escondida o app continua vivo; só sai pelo menu da bandeja
  app.on('window-all-closed', () => {
    if (isQuitting) app.quit();
  });
}
