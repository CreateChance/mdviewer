# MD Viewer v{VERSION}

The {first/next} release of MD Viewer — a minimal, fast desktop Markdown reader built with Tauri, React, and TypeScript.

## ✨ Features

<!-- List new features, changes, and fixes for this release -->

- **Markdown Rendering** — Full GFM support including tables, task lists, strikethrough, and emoji
- **Code Highlighting** — Automatic language detection and syntax highlighting powered by highlight.js
- **Math Formulas** — Inline and block math expressions rendered via KaTeX
- **Mermaid Diagrams** — Flowcharts, sequence diagrams, Gantt charts, and more
- **Inline HTML** — Supports raw HTML embedded in Markdown (e.g. `<img>`, `<p>`, `<details>`)
- **Table of Contents** — Auto-generated sidebar with click-to-jump, scroll-aware active highlighting, and drag-to-resize
- **File Explorer** — Right-side tree view that recursively lists all Markdown files in a directory
- **Light / Dark Theme** — One-click toggle with automatic preference persistence
- **Live Reload** — Automatically refreshes preview when the file is modified by an external editor
- **Directory Watching** — File explorer auto-refreshes when files are added or removed
- **Smart Link Navigation** — Relative `.md` links open within the app; external URLs open in the system browser
- **Local Image Support** — Renders relative-path images via Tauri asset protocol

## 📦 Downloads

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `mdviewer_{VERSION}_aarch64.dmg` |
| macOS (Intel) | `mdviewer_{VERSION}_x64.dmg` |
| Windows (x64) | `mdviewer_{VERSION}_x64-setup.exe` / `mdviewer_{VERSION}_x64_en-US.msi` |
| Linux (Debian/Ubuntu) | `mdviewer_{VERSION}_amd64.deb` |
| Linux (AppImage) | `mdviewer_{VERSION}_amd64.AppImage` |

> **macOS users:** If you see "mdviewer is damaged and can't be opened", run `/usr/bin/xattr -cr /Applications/mdviewer.app` in Terminal.

## 🛠 Tech Stack

Tauri v1 · React 19 · TypeScript · Vite 7 · react-markdown · highlight.js · KaTeX · Mermaid · notify (Rust)

## 📄 License

[Apache License 2.0](LICENSE)
