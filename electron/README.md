# Gemini Voyager Desktop

Electron wrapper that runs the Gemini Voyager Chrome extension as a standalone desktop application.

## Prerequisites

- Node.js ≥ 18
- The Chrome extension must be built first

## Quick Start

```bash
# 1. Build the Chrome extension (from project root)
npm run build

# 2. Install Electron dependencies
cd electron
npm install

# 3. Run in development mode
npm start
```

## Packaging

```bash
# Windows (NSIS installer + portable)
npm run build:win

# macOS (DMG)
npm run build:mac

# Linux (AppImage)
npm run build:linux
```

Output goes to `../dist_electron/`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+1` | Open Gemini |
| `Ctrl+2` | Open AI Studio |
| `Ctrl+,` | Extension Settings |
| `Ctrl+R` | Reload page |
| `F12` | Toggle DevTools |

## How It Works

Electron embeds Chromium, which natively supports Chrome Extension APIs. On startup, the app:

1. Loads the built extension from `dist_chrome/` (dev) or bundled `resources/extension/` (packaged)
2. Opens Gemini in the main window with the extension active
3. All extension features (timeline, folders, export, watermark remover, etc.) work identically to Chrome

## Notes

- App size is ~200MB due to bundled Chromium
- Extension popup is accessible via the menu (`Ctrl+,`)
- Google sign-in for Cloud Sync works through the embedded browser
