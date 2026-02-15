const { app, BrowserWindow, session, ipcMain, Menu, Tray, nativeImage, protocol, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration issues on some systems
// app.disableHardwareAcceleration();

// Set a dedicated userData directory to avoid cache permission issues
const userDataPath = path.join(app.getPath('appData'), 'gemini-voyager-desktop');
app.setPath('userData', userDataPath);

// Keep references to prevent garbage collection
let mainWindow = null;
let popupWindow = null;
let tray = null;
let extensionId = null;

// Path to persistent custom domains config
const customDomainsPath = path.join(userDataPath, 'custom-domains.json');

// Debounce timer for extension reload
let reloadTimer = null;

// Resolve the extension path (works in dev and packaged mode)
function getExtensionPath() {
  // Packaged: extraResources puts it in resources/extension
  const packagedPath = path.join(process.resourcesPath, 'extension');
  if (fs.existsSync(packagedPath)) return packagedPath;

  // Dev: use the prepared extension folder (patched for Electron)
  const preparedPath = path.join(__dirname, 'extension');
  if (fs.existsSync(preparedPath)) return preparedPath;

  throw new Error(
    'Extension not found. Run "node prepare-extension.js" in the electron/ directory first.'
  );
}

// Prepare extension for Electron (dev mode only)
function prepareExtensionIfNeeded() {
  const preparedPath = path.join(__dirname, 'extension');
  const srcPath = path.join(__dirname, '..', 'dist_chrome');

  if (!fs.existsSync(srcPath)) {
    throw new Error('dist_chrome not found. Run "npm run build" in the project root first.');
  }

  // Re-prepare if dist_chrome is newer or extension doesn't exist
  const needsPrepare =
    !fs.existsSync(preparedPath) ||
    !fs.existsSync(path.join(preparedPath, 'electron-polyfill.js'));

  if (needsPrepare) {
    console.log('[Gemini Voyager] Preparing extension for Electron...');
    require('./prepare-extension');
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Gemini Voyager',
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for extension support
      webviewTag: false,
    },
    show: false, // Show after ready-to-show to prevent flash
  });

  // Show window once content is ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open Gemini by default
  mainWindow.loadURL('https://gemini.google.com/app');

  // Build application menu
  buildAppMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external link clicks — open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowedOrigins = [
      'https://gemini.google.com',
      'https://aistudio.google.com',
      'https://accounts.google.com',
    ];
    const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin));
    if (isAllowed) {
      return { action: 'allow' };
    }
    // Open external links in the system browser
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createPopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }

  const extensionPath = getExtensionPath();
  const popupUrl = `chrome-extension://${extensionId}/src/pages/popup/index.html`;

  popupWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 500,
    resizable: true,
    title: 'Gemini Voyager Settings',
    icon: getAppIcon(),
    parent: mainWindow,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  popupWindow.loadURL(popupUrl);
  popupWindow.setMenuBarVisibility(false);

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
}

function getAppIcon() {
  // Try multiple icon locations
  const candidates = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '..', 'src', 'assets', 'img', 'icon-128.png'),
    path.join(__dirname, '..', 'dist_chrome', 'icon-128.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return nativeImage.createFromPath(p);
  }
  return undefined;
}

function buildAppMenu() {
  const template = [
    {
      label: 'Gemini Voyager',
      submenu: [
        {
          label: 'Open Gemini',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.loadURL('https://gemini.google.com/app'),
        },
        {
          label: 'Open AI Studio',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.loadURL('https://aistudio.google.com'),
        },
        { type: 'separator' },
        {
          label: 'Extension Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => createPopupWindow(),
        },
        { type: 'separator' },
        {
          label: 'Export Settings...',
          click: () => exportSettings(),
        },
        {
          label: 'Import Settings...',
          click: () => importSettings(),
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Custom Website Injection (chrome.scripting bridge) ─────────

/**
 * Read saved custom domains from disk.
 */
function readCustomDomains() {
  try {
    if (fs.existsSync(customDomainsPath)) {
      return JSON.parse(fs.readFileSync(customDomainsPath, 'utf-8'));
    }
  } catch {}
  return { matches: [] };
}

/**
 * Write custom domains to disk.
 */
function writeCustomDomains(config) {
  fs.mkdirSync(path.dirname(customDomainsPath), { recursive: true });
  fs.writeFileSync(customDomainsPath, JSON.stringify(config, null, 2));
}

/**
 * Update the extension manifest's content_scripts with custom domains,
 * then reload the extension so Electron picks up the new matches.
 */
async function reloadExtensionWithCustomDomains() {
  const extPath = getExtensionPath();
  const manifestPath = path.join(extPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const config = readCustomDomains();

  if (manifest.content_scripts && config.matches.length > 0) {
    for (const cs of manifest.content_scripts) {
      const existing = new Set(cs.matches || []);
      for (const m of config.matches) existing.add(m);
      cs.matches = Array.from(existing);
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // Reload extension
  if (extensionId) {
    try {
      await session.defaultSession.removeExtension(extensionId);
    } catch {}
    const ext = await session.defaultSession.loadExtension(extPath, {
      allowFileAccess: true,
    });
    extensionId = ext.id;
    console.log('[Gemini Voyager] Extension reloaded with custom domains:', config.matches);
    mainWindow?.webContents.reload();
  }
}

/**
 * Debounced extension reload — avoids rapid reloads when unregister + register
 * happen in sequence.
 */
function scheduleExtensionReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    reloadExtensionWithCustomDomains().catch((e) =>
      console.error('[Gemini Voyager] Reload failed:', e)
    );
  }, 800);
}

/**
 * Register the voyager-ipc:// protocol for extension ↔ main process communication.
 * Used by the polyfill for chrome.scripting and settings export/import.
 */
function registerVoyagerProtocol() {
  protocol.handle('voyager-ipc', async (request) => {
    const url = new URL(request.url);

    // ── chrome.scripting.registerContentScripts ──
    if (url.pathname === '/register-scripts') {
      try {
        const scripts = await request.json();
        const allMatches = [];
        for (const s of scripts) {
          if (s.matches) allMatches.push(...s.matches);
        }
        if (allMatches.length > 0) {
          const config = readCustomDomains();
          const merged = new Set([...config.matches, ...allMatches]);
          writeCustomDomains({ matches: Array.from(merged) });
          scheduleExtensionReload();
        }
      } catch (e) {
        console.error('[voyager-ipc] register-scripts error:', e);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── chrome.scripting.unregisterContentScripts ──
    if (url.pathname === '/unregister-scripts') {
      try {
        const body = await request.json();
        if (body.ids) {
          // Clear custom domains (the next register call will set new ones)
          writeCustomDomains({ matches: [] });
        }
      } catch (e) {
        console.error('[voyager-ipc] unregister-scripts error:', e);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Settings export ──
    if (url.pathname === '/export-settings') {
      await exportSettings();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Settings import ──
    if (url.pathname === '/import-settings') {
      await importSettings();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  });
}

// ─── Settings Export / Import ───────────────────────────────────

async function getSettingsWindow() {
  // Use popup window if available (has chrome.storage access), else create a temporary one
  if (popupWindow && !popupWindow.isDestroyed()) return popupWindow;

  // Create a hidden popup window to access extension storage
  const tmpWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  const popupUrl = `chrome-extension://${extensionId}/src/pages/popup/index.html`;
  await tmpWin.loadURL(popupUrl);
  return tmpWin;
}

async function exportSettings() {
  if (!mainWindow || !extensionId) return;

  const win = await getSettingsWindow();
  try {
    const data = await win.webContents.executeJavaScript(
      `new Promise(r => chrome.storage.local.get(null, r))`
    );

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Gemini Voyager Settings',
      defaultPath: 'gemini-voyager-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log('[Gemini Voyager] Settings exported to:', filePath);
    }
  } catch (e) {
    console.error('[Gemini Voyager] Export failed:', e);
  } finally {
    // Close temporary window if we created one
    if (win !== popupWindow && !win.isDestroyed()) win.close();
  }
}

async function importSettings() {
  if (!mainWindow || !extensionId) return;

  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Gemini Voyager Settings',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!filePaths || filePaths.length === 0) return;

  const win = await getSettingsWindow();
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    const escaped = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    await win.webContents.executeJavaScript(
      `new Promise(r => chrome.storage.local.set(JSON.parse('${escaped}'), r))`
    );
    console.log('[Gemini Voyager] Settings imported from:', filePaths[0]);
    mainWindow.webContents.reload();
  } catch (e) {
    console.error('[Gemini Voyager] Import failed:', e);
  } finally {
    if (win !== popupWindow && !win.isDestroyed()) win.close();
  }
}

// ─── App lifecycle ───────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    // Register voyager-ipc protocol for extension ↔ main communication
    registerVoyagerProtocol();

    // In dev mode, automatically prepare extension if needed
    if (!app.isPackaged) {
      prepareExtensionIfNeeded();
    }

    const extPath = getExtensionPath();
    console.log('[Gemini Voyager] Loading extension from:', extPath);

    // Apply saved custom domains to manifest before loading
    const config = readCustomDomains();
    if (config.matches.length > 0) {
      const manifestPath = path.join(extPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      for (const cs of (manifest.content_scripts || [])) {
        const existing = new Set(cs.matches || []);
        for (const m of config.matches) existing.add(m);
        cs.matches = Array.from(existing);
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('[Gemini Voyager] Applied saved custom domains:', config.matches);
    }

    // Load the Chrome extension into the default session
    const ext = await session.defaultSession.loadExtension(extPath, {
      allowFileAccess: true,
    });
    extensionId = ext.id;
    console.log('[Gemini Voyager] Extension loaded, ID:', extensionId);

    // Grant all permissions
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        callback(true);
      }
    );

    createMainWindow();
  } catch (err) {
    console.error('[Gemini Voyager] Failed to start:', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});
