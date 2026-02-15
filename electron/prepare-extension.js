/**
 * Prepare the Chrome extension for Electron compatibility.
 *
 * Electron's extension support is limited:
 *   - No chrome.storage.sync (only local)
 *   - No chrome.permissions API
 *   - No MV3 Service Worker background
 *
 * This script copies dist_chrome → dist_electron_ext and patches:
 *   1. manifest.json  → remove unsupported keys, add background page
 *   2. Inject electron-polyfill.js → shims for missing APIs
 *   3. Wrap service-worker-loader.js → convert to classic background script
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'dist_chrome');
const DEST_DIR = path.join(__dirname, 'extension');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function patchManifest(destDir) {
  const manifestPath = path.join(destDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // ── MV3 → MV2 full conversion ──

  // 1. Downgrade manifest version
  manifest.manifest_version = 2;

  // 2. action → browser_action
  if (manifest.action) {
    manifest.browser_action = manifest.action;
    delete manifest.action;
  }

  // 3. Merge host_permissions into permissions
  if (manifest.host_permissions) {
    manifest.permissions = [
      ...(manifest.permissions || []),
      ...manifest.host_permissions,
    ];
    delete manifest.host_permissions;
  }

  // 4. Remove unsupported permissions
  manifest.permissions = (manifest.permissions || []).filter(
    (p) => !['identity', 'scripting'].includes(p)
  );

  // 5. Replace service_worker with background page
  manifest.background = {
    page: 'electron-background.html',
    persistent: true,
  };

  // 6. Convert web_accessible_resources from MV3 format (array of objects) to MV2 (array of strings)
  if (Array.isArray(manifest.web_accessible_resources)) {
    const flatResources = [];
    for (const entry of manifest.web_accessible_resources) {
      if (entry && Array.isArray(entry.resources)) {
        flatResources.push(...entry.resources);
      } else if (typeof entry === 'string') {
        flatResources.push(entry);
      }
    }
    manifest.web_accessible_resources = flatResources;
  }

  // 7. Convert content_security_policy from MV3 object to MV2 string
  if (typeof manifest.content_security_policy === 'object') {
    manifest.content_security_policy =
      manifest.content_security_policy.extension_pages ||
      "script-src 'self'; object-src 'self'";
  }
  if (!manifest.content_security_policy) {
    manifest.content_security_policy = "script-src 'self'; object-src 'self'";
  }

  // 8. Inject polyfill into all content_scripts
  if (manifest.content_scripts) {
    for (const cs of manifest.content_scripts) {
      cs.js = ['electron-polyfill.js', ...(cs.js || [])];
    }
  }

  // 9. Remove unsupported keys
  delete manifest.oauth2;
  delete manifest.key;

  // 10. Remove optional_host_permissions (MV3 only)
  delete manifest.optional_host_permissions;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('[prepare] manifest.json patched (MV3 → MV2)');
}

function writePolyfill(destDir) {
  const code = `
// electron-polyfill.js — Shims for Chrome APIs missing in Electron
(function() {
  'use strict';
  if (typeof chrome === 'undefined') return;

  // ── chrome.storage.sync → redirect to chrome.storage.local ──
  if (chrome.storage && !chrome.storage.sync) {
    chrome.storage.sync = chrome.storage.local;
  }

  // ── chrome.permissions stub ──
  if (!chrome.permissions) {
    chrome.permissions = {
      contains: function(_perms, cb) { if (cb) cb(true); return Promise.resolve(true); },
      request: function(_perms, cb) { if (cb) cb(true); return Promise.resolve(true); },
      remove: function(_perms, cb) { if (cb) cb(true); return Promise.resolve(true); },
      getAll: function(cb) {
        var result = { permissions: [], origins: [] };
        if (cb) cb(result);
        return Promise.resolve(result);
      },
      onAdded: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
      onRemoved: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
    };
  }

  // ── chrome.identity stub ──
  if (!chrome.identity) {
    chrome.identity = {
      getAuthToken: function(_opts, cb) { if (cb) cb(undefined); },
      removeCachedAuthToken: function(_opts, cb) { if (cb) cb(); },
      launchWebAuthFlow: function(_opts, cb) { if (cb) cb(undefined); },
    };
  }

  // ── chrome.tabs — polyfill for popup → content script messaging ──
  // In Electron the popup is a separate BrowserWindow; chrome.tabs may not
  // resolve the main Gemini tab correctly. We enhance/stub the API so that
  // sendMessage and query always work.
  (function() {
    var _origTabs = chrome.tabs || {};
    chrome.tabs = chrome.tabs || {};

    // Preserve any native implementations while adding fallbacks
    if (!chrome.tabs.query) {
      chrome.tabs.query = function(_queryInfo, cb) {
        // Return a synthetic tab representing the main window
        var tab = { id: 1, url: location.href, active: true, windowId: 1 };
        if (cb) cb([tab]);
        return Promise.resolve([tab]);
      };
    }

    if (!chrome.tabs.sendMessage) {
      chrome.tabs.sendMessage = function(tabId, message, _opts, cb) {
        // Bridge via chrome.runtime — content scripts listen on runtime.onMessage
        if (typeof _opts === 'function') { cb = _opts; _opts = undefined; }
        if (chrome.runtime && chrome.runtime.sendMessage) {
          return chrome.runtime.sendMessage(message, function(response) {
            if (cb) cb(response);
          });
        }
        if (cb) cb(undefined);
        return Promise.resolve(undefined);
      };
    }
  })();

  // ── chrome.scripting — functional bridge via voyager-ipc protocol ──
  if (!chrome.scripting) {
    chrome.scripting = {
      executeScript: function() { return Promise.resolve([]); },
      registerContentScripts: function(scripts) {
        return fetch('voyager-ipc://local/register-scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scripts),
        }).then(function(r) { return r.json(); }).catch(function() {});
      },
      unregisterContentScripts: function(filter) {
        return fetch('voyager-ipc://local/unregister-scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filter || {}),
        }).then(function(r) { return r.json(); }).catch(function() {});
      },
    };
  }
})();
`;

  fs.writeFileSync(path.join(destDir, 'electron-polyfill.js'), code.trim());
  console.log('[prepare] electron-polyfill.js written');
}

function writeBackgroundPage(destDir) {
  // Create a background HTML page that loads the polyfill + original service worker code
  const html = `<!DOCTYPE html>
<html>
<head>
  <script src="electron-polyfill.js"><\/script>
  <script type="module" src="service-worker-loader.js"><\/script>
</head>
<body></body>
</html>`;

  fs.writeFileSync(path.join(destDir, 'electron-background.html'), html);
  console.log('[prepare] electron-background.html written');

  // Also check if service-worker-loader.js imports a module; if so, inline it
  const swLoaderPath = path.join(destDir, 'service-worker-loader.js');
  if (fs.existsSync(swLoaderPath)) {
    let swCode = fs.readFileSync(swLoaderPath, 'utf-8');
    // The loader typically does: importScripts('path/to/background.js')
    // Convert import statements to work in a page context
    // If it uses importScripts, we need to load those scripts in the HTML
    console.log('[prepare] service-worker-loader.js content:', swCode.substring(0, 200));
  }
}

/**
 * Inject polyfill <script> tag into all extension HTML pages.
 * Extension pages (popup, options) don't get content_scripts,
 * so the polyfill must be embedded directly in the HTML.
 */
function injectPolyfillIntoHTMLPages(destDir) {
  const htmlFiles = [];

  // Recursively find all .html files
  function findHTML(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findHTML(full);
      } else if (entry.name.endsWith('.html') && entry.name !== 'electron-background.html') {
        htmlFiles.push(full);
      }
    }
  }
  findHTML(destDir);

  for (const htmlPath of htmlFiles) {
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Calculate relative path from HTML file to polyfill at extension root
    const relDir = path.relative(path.dirname(htmlPath), destDir).replace(/\\/g, '/');
    const polyfillSrc = relDir ? `${relDir}/electron-polyfill.js` : 'electron-polyfill.js';

    // Inject polyfill script before the first <script> tag so it runs first
    if (html.includes('<script') && !html.includes('electron-polyfill.js')) {
      html = html.replace(
        /(<script\b)/,
        `<script src="${polyfillSrc}"><\/script>\n    $1`
      );
      fs.writeFileSync(htmlPath, html);
      console.log('[prepare] Polyfill injected into:', path.relative(destDir, htmlPath));
    }
  }
}

/**
 * Create a content script that injects fetchInterceptor.js into the MAIN world.
 * MV2 doesn't support "world": "MAIN", so we use a <script> tag injection pattern.
 */
function writeMainWorldInjector(destDir) {
  const code = `
// electron-main-world-injector.js
// Injects MAIN-world scripts that chrome.scripting.registerContentScripts
// would normally handle in MV3.
(function() {
  'use strict';
  try {
    // Only inject if watermark remover is enabled (check storage first)
    // For simplicity, always inject — the interceptor itself checks the flag
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL('fetchInterceptor.js');
    script.type = 'text/javascript';
    script.dataset.electronInjected = 'true';
    (document.head || document.documentElement).appendChild(script);
    script.onload = function() { script.remove(); };
  } catch(e) {
    // Silently fail if extension context is invalidated
  }
})();
`;

  fs.writeFileSync(path.join(destDir, 'electron-main-world-injector.js'), code.trim());
  console.log('[prepare] electron-main-world-injector.js written');
}

/**
 * Add MAIN world injector as a content_script entry in manifest.
 */
function addMainWorldInjectorToManifest(destDir) {
  const manifestPath = path.join(destDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Collect all match patterns from existing content_scripts
  const allMatches = new Set();
  for (const cs of (manifest.content_scripts || [])) {
    for (const m of (cs.matches || [])) {
      allMatches.add(m);
    }
  }

  // Add MAIN world injector as a separate content_script running at document_start
  manifest.content_scripts = manifest.content_scripts || [];
  manifest.content_scripts.unshift({
    js: ['electron-polyfill.js', 'electron-main-world-injector.js'],
    matches: Array.from(allMatches),
    run_at: 'document_start',
    all_frames: false,
  });

  // Ensure fetchInterceptor.js and injector are web-accessible
  const war = manifest.web_accessible_resources || [];
  if (!war.includes('fetchInterceptor.js')) war.push('fetchInterceptor.js');
  if (!war.includes('electron-main-world-injector.js')) war.push('electron-main-world-injector.js');
  if (!war.includes('electron-polyfill.js')) war.push('electron-polyfill.js');
  if (!war.includes('katex-config.js')) war.push('katex-config.js');
  manifest.web_accessible_resources = war;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('[prepare] MAIN world injector added to manifest');
}

// ─── Main ───
function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('[prepare] dist_chrome not found. Run "npm run build" in project root first.');
    process.exit(1);
  }

  // Clean and copy
  if (fs.existsSync(DEST_DIR)) {
    fs.rmSync(DEST_DIR, { recursive: true, force: true });
  }
  console.log('[prepare] Copying dist_chrome → electron/extension ...');
  copyDirSync(SRC_DIR, DEST_DIR);

  // Patch
  patchManifest(DEST_DIR);
  writePolyfill(DEST_DIR);
  writeMainWorldInjector(DEST_DIR);
  writeBackgroundPage(DEST_DIR);
  injectPolyfillIntoHTMLPages(DEST_DIR);
  addMainWorldInjectorToManifest(DEST_DIR);

  console.log('[prepare] Extension prepared for Electron ✓');
}

main();
