<div align="center">
  <img src="public/icon-128.png" alt="Gemini Voyager Desktop" width="128"/>
  <h1>Gemini Voyager — Desktop Edition</h1>
  <h3>🖥️ Electron 桌面版 · 全功能离线体验</h3>

  <p>
    <img src="https://img.shields.io/badge/Electron-33+-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/Windows-✓-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Windows">
    <img src="https://img.shields.io/badge/macOS-✓-000000?style=flat-square&logo=apple&logoColor=white" alt="macOS">
    <img src="https://img.shields.io/badge/Linux-✓-FCC624?style=flat-square&logo=linux&logoColor=black" alt="Linux">
    <img src="https://img.shields.io/badge/TypeScript-✓-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vite-✓-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  </p>

  <p>
    基于 <a href="https://github.com/Nagi-ovo/gemini-voyager"><b>Nagi-ovo/gemini-voyager</b></a> 的 Electron 桌面封装版本。<br/>
    将浏览器扩展的全部功能带入独立桌面应用，无需安装浏览器扩展。
  </p>
</div>

<p align="center">
  🇬🇧 <a href="#-about--english">English</a> · 
  🇨🇳 <a href="#-关于--中文">中文</a>
</p>

---

## 🙏 Credits & Acknowledgments / 致谢

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/Nagi-ovo/gemini-voyager">
        <img src="https://img.shields.io/badge/Original_Project-Gemini_Voyager-blue?style=for-the-badge&logo=github" alt="Original Project" height="32">
      </a>
      <br/><br/>
      <b>Gemini Voyager</b> by <a href="https://github.com/Nagi-ovo">Jesse Zhang (Nagi-ovo)</a><br/>
      <sub>The original Chrome/Firefox/Safari extension that powers everything.<br/>All core features, UI design, and architecture belong to the original project.</sub>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/Reborn14/chatgpt-conversation-timeline">
        <img src="https://img.shields.io/badge/Inspiration-ChatGPT_Timeline-green?style=for-the-badge&logo=github" alt="Inspiration" height="32">
      </a>
      <br/><br/>
      <b>ChatGPT Conversation Timeline</b><br/>
      <sub>The original timeline navigation concept that inspired Gemini Voyager.</sub>
    </td>
  </tr>
</table>

> **License**: This project inherits the **GPLv3** license from the original Gemini Voyager project.

---

## 📖 About / English

### What is this?

This is an **Electron desktop wrapper** for [Gemini Voyager](https://github.com/Nagi-ovo/gemini-voyager), the all-in-one enhancement suite for Google Gemini. It packages the browser extension into a standalone desktop application with full feature parity — plus additional desktop-specific enhancements.

### Why a Desktop Version?

- **No browser extension installation** — just launch and use
- **Dedicated window** — separate from your browser, always accessible
- **Native OS integration** — system tray, keyboard shortcuts, file dialogs
- **Settings export/import** — backup and restore via native file picker (replaces Chrome Sync)
- **Custom website injection** — works seamlessly via IPC protocol bridge

---

## 📖 关于 / 中文

### 这是什么？

这是 [Gemini Voyager](https://github.com/Nagi-ovo/gemini-voyager) 的 **Electron 桌面封装版**。它将浏览器扩展的全部功能打包为独立桌面应用，无需安装浏览器扩展即可使用所有功能，并增加了桌面端专属增强。

### 为什么需要桌面版？

- **无需安装浏览器扩展** — 启动即用
- **独立窗口** — 与浏览器分离，随时可用
- **原生系统集成** — 系统托盘、快捷键、文件对话框
- **设置导出/导入** — 通过原生文件选择器备份和恢复（替代 Chrome Sync）
- **自定义网站注入** — 通过 IPC 协议桥接无缝工作

---

## ✨ Original Features / 原版功能

> All features from the original [Gemini Voyager](https://github.com/Nagi-ovo/gemini-voyager) are fully supported in the desktop edition.

### 🌌 Core / 核心功能

| Feature / 功能 | Description / 描述 |
|---|---|
| 📂 **Folder Organization** | Two-level folder hierarchy with drag-and-drop / 两级文件夹 + 拖拽排序 |
| 💡 **Prompt Vault** | Save & reuse prompts across platforms / 跨平台提示词库 |
| ☁️ **Cloud Sync** | Sync to Google Drive / 同步到 Google Drive |
| 📐 **Formula Copy** | One-click LaTeX & MathML copy / 一键复制公式源码 |

### ✨ Gemini Exclusive / Gemini 专属

| Feature / 功能 | Description / 描述 |
|---|---|
| 📍 **Timeline Navigation** | Visual nodes, star moments, branch management / 时间线导航、收藏、分支管理 |
| 💾 **Chat Export** | JSON, Markdown, PDF with images / 对话导出（含图片） |
| 🧜‍♀️ **Mermaid Rendering** | Auto-render flowcharts & diagrams / 自动渲染流程图 |
| 📝 **Markdown Fix** | Fix broken bold syntax / 修复 Markdown 加粗语法 |
| 🍌 **NanoBanana** | Lossless watermark removal / 无损去水印 |
| 🔬 **Deep Research Export** | Extract thinking + links as MD/PDF/JSON / 导出深度研究思考过程 |
| 💬 **Quote Reply** | Select text → reply with context / 选中文本引用回复 |
| 🗑️ **Batch Delete** | Multi-select & bulk delete conversations / 批量删除对话 |
| 🏷️ **Tab Title Sync** | Auto-sync tab title to conversation / 标签页标题同步 |
| 📥 **Input Collapse** | Auto-expandable input area / 输入框自动折叠 |
| 🤖 **Default Model** | Set favorite model as default / 设置默认模型 |
| 👁️ **Hide Recents & Gems** | Toggle sidebar sections with peek bars / 隐藏最近项目和 Gems |
| 🔗 **Context Sync (CoBridge)** | Sync conversation context to IDE / 上下文同步到 IDE |

---

## 🖥️ Desktop-Specific Enhancements / 桌面版专属增强

> These features are unique to the Electron desktop edition.

### 🔧 Architecture / 架构

| Component / 组件 | Description / 描述 |
|---|---|
| **`electron/main.js`** | Main process: window management, extension loading, IPC protocol |
| **`electron/prepare-extension.js`** | MV3 → MV2 manifest patching, polyfill injection |
| **`electron-polyfill.js`** | Chrome API shims: `storage.sync`, `tabs`, `permissions`, `identity`, `scripting` |
| **`voyager-ipc://` protocol** | Custom protocol for extension ↔ main process communication |

### 🆕 Desktop Features / 桌面版功能

<table>
  <tr>
    <th>Feature / 功能</th>
    <th>Details / 详情</th>
  </tr>
  <tr>
    <td>💾 <b>Settings Export/Import</b></td>
    <td>
      <b>EN</b>: Native file dialog to export/import all extension settings as JSON. Replaces Chrome Sync for desktop.<br/>
      <b>CN</b>: 原生文件对话框导出/导入全部扩展设置（JSON 格式），替代 Chrome Sync。<br/>
      Menu: <code>Gemini Voyager → Export/Import Settings</code>
    </td>
  </tr>
  <tr>
    <td>🌐 <b>Custom Website Injection</b></td>
    <td>
      <b>EN</b>: Full <code>chrome.scripting</code> bridge via <code>voyager-ipc://</code> protocol. Register custom domains and auto-reload extension with new content script matches.<br/>
      <b>CN</b>: 通过 <code>voyager-ipc://</code> 协议完整桥接 <code>chrome.scripting</code>，支持注册自定义域名并自动重载扩展。
    </td>
  </tr>
  <tr>
    <td>🔌 <b>Chrome API Polyfills</b></td>
    <td>
      <b>EN</b>: Complete polyfill layer for APIs not natively supported in Electron:<br/>
      <code>chrome.storage.sync</code> → <code>local</code>, <code>chrome.tabs</code>, <code>chrome.permissions</code>, <code>chrome.identity</code>, <code>chrome.scripting</code><br/>
      <b>CN</b>: 完整的 Chrome API 兼容层，适配 Electron 不原生支持的 API。
    </td>
  </tr>
  <tr>
    <td>⌨️ <b>Keyboard Shortcuts</b></td>
    <td>
      <code>Ctrl+1</code> Open Gemini · <code>Ctrl+2</code> Open AI Studio · <code>Ctrl+,</code> Settings · <code>F12</code> DevTools
    </td>
  </tr>
  <tr>
    <td>📦 <b>Cross-Platform Build</b></td>
    <td>
      Windows (NSIS + Portable) · macOS (DMG) · Linux (AppImage)
    </td>
  </tr>
</table>

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置条件

```bash
# Build the extension first (from project root)
bun install
bun run build:chrome
```

### Run Desktop App / 启动桌面版

```bash
cd electron
npm install
npm start
```

### Build Installer / 构建安装包

```bash
cd electron

# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Output directory: `dist_electron/`

---

## 📁 Project Structure / 项目结构

```
gemini-voyager/
├── src/                          # 🧠 Extension source (original)
│   ├── core/                     #    Core services & types
│   ├── features/                 #    Feature modules
│   ├── pages/                    #    Entry points (popup, content, background)
│   ├── components/               #    UI components
│   └── locales/                  #    i18n translations
│
├── electron/                     # 🖥️ Desktop wrapper (this fork)
│   ├── main.js                   #    Electron main process
│   ├── prepare-extension.js      #    Extension patcher (MV3→MV2 + polyfills)
│   ├── package.json              #    Desktop app config & build scripts
│   └── extension/                #    (generated) Patched extension for Electron
│
├── docs/                         # 📖 Documentation
│   ├── ai-guides/                #    AI assistant guides (AGENTS.md, CLAUDE.md)
│   ├── en/, zh_TW/, ja/, ...     #    Multilingual docs
│   └── public/                   #    Static assets
│
├── .github/                      # 🔧 GitHub config
│   ├── README_ZH.md, ...         #    Translated READMEs
│   ├── CONTRIBUTING.md           #    Contribution guide
│   └── workflows/                #    CI/CD
│
└── dist_chrome/                  # 📦 Built extension (Chrome)
```

---

## 🔗 Related Projects / 相关项目

| Project / 项目 | Description / 描述 |
|---|---|
| [Gemini Voyager (Original)](https://github.com/Nagi-ovo/gemini-voyager) | The original browser extension / 原版浏览器扩展 |
| [DeepSeek Voyager](https://github.com/Azurboy/deepseek-voyager) | Fork adapted for DeepSeek / DeepSeek 适配版 |
| [CoBridge](https://github.com/) | IDE context sync plugin / IDE 上下文同步插件 |
| [Voyager Docs](https://voyager.nagi.fun/en) | Official documentation / 官方文档 |

---

## 🤝 Contributing / 贡献

### 🇬🇧 English

Contributions are welcome! This fork focuses on the Electron desktop experience. For core extension features, please contribute to the [original project](https://github.com/Nagi-ovo/gemini-voyager).

### 🇨🇳 中文

欢迎贡献！本 Fork 专注于 Electron 桌面端体验。核心扩展功能请向[原项目](https://github.com/Nagi-ovo/gemini-voyager)贡献。

<details>
<summary>Development Setup / 开发环境</summary>

```bash
# 1. Install dependencies
bun install

# 2. Build extension
bun run build:chrome

# 3. Run desktop app
cd electron && npm install && npm start
```

</details>

---

<div align="center">
  <p>
    <b>Original Project</b> by <a href="https://github.com/Nagi-ovo">Jesse Zhang (Nagi-ovo)</a> · 
    <b>Desktop Edition</b> by <a href="https://github.com/sjkncs">Yangting Song (sjkncs)</a>
  </p>
  <sub>GPLv3 License © 2026</sub>
</div>
