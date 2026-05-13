# MD Viewer

A lightweight, fast desktop Markdown reader built with Tauri + React + TypeScript. Supports GFM, code highlighting, math formulas, Mermaid diagrams, live reload, and more — all in a clean, native experience across macOS, Windows, and Linux.

<p align="center">
  <img src="./screenshots/main.png" alt="Screenshot" width="720" />
</p>

## Downloads

You can download the latest release from the [GitHub Releases](https://github.com/CreateChance/mdviewer/releases) page.

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `mdviewer_x.x.x_aarch64.dmg` |
| macOS (Intel) | `mdviewer_x.x.x_x64.dmg` |
| Windows (x64) | `mdviewer_x.x.x_x64-setup.exe` / `mdviewer_x.x.x_x64_en-US.msi` |
| Linux (Debian/Ubuntu) | `mdviewer_x.x.x_amd64.deb` |
| Linux (AppImage) | `mdviewer_x.x.x_amd64.AppImage` |

> **macOS users:** If you see "mdviewer is damaged and can't be opened", run the following command in Terminal:
> ```bash
> /usr/bin/xattr -cr /Applications/mdviewer.app
> ```

## Features

- **Markdown Rendering** — Powered by react-markdown with GFM support (tables, task lists, strikethrough, etc.) and Emoji
- **Table of Contents** — Auto-generated TOC sidebar on the left with click-to-jump, scroll-aware highlighting, tree-structured headings, and drag-to-resize
- **File Explorer** — Right-side file tree that recursively lists all Markdown files in a directory, with auto-refresh on filesystem changes and drag-to-resize
- **Full-text Search** — In-document search (⌘F / Ctrl+F) with match highlighting via CSS Custom Highlight API, match count, and keyboard navigation
- **Code Highlighting** — Syntax highlighting via highlight.js with copy, expand (fullscreen), and collapse actions per code block
- **Math Formulas** — KaTeX-based rendering for both inline and block math expressions
- **Mermaid Diagrams** — Supports flowcharts, sequence diagrams, Gantt charts, and more
- **Alerts** — Microsoft Learn-style alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!CAUTION]`, `[!WARNING]`)
- **Image Lightbox** — Click any image to open a zoomable, pannable lightbox overlay
- **Theme Switching** — Light / dark theme toggle with automatic preference persistence and native titlebar sync
- **Content Width** — Three reading width modes (compact / standard / wide) with persistence
- **Live Reload** — Automatically refreshes preview when the file is modified externally
- **Smart Link Navigation** — Relative `.md` links open within the app; external URLs open in the system browser
- **Local Image Support** — Renders relative-path images embedded in Markdown via Tauri asset protocol
- **File Association** — Double-click `.md` / `.markdown` / `.mdx` files in Finder/Explorer to open directly in MD Viewer
- **Native Menu** — Platform-native menu bar with Open File (⌘O), Open Folder (⌘⇧O), and standard Edit actions
- **Link Preview** — Hover over links to see the target URL in a status bar

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | [Tauri v2](https://tauri.app/) |
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Markdown | react-markdown + remark-gfm + remark-math + remark-gemoji |
| Code Highlighting | rehype-highlight + highlight.js |
| Math | rehype-katex + KaTeX |
| HTML Support | rehype-raw |
| Diagrams | Mermaid |
| File Watching | notify + notify-debouncer-mini |
| Directory Scanning | walkdir |
| Package Manager | pnpm |

## Project Structure

```
mdviewer/
├── index.html                    # Entry HTML
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json                 # TypeScript config
├── tsconfig.node.json            # Node-side TS config (for Vite)
├── vite.config.ts                # Vite config
├── public/                       # Static assets
├── src/                          # Frontend source
│   ├── main.tsx                  # App entry, global style imports
│   ├── App.tsx                   # Root component, file handling & layout
│   ├── components/
│   │   ├── FileExplorer.tsx      # Right-side file tree browser (drag-to-resize)
│   │   ├── ImageLightbox.tsx     # Zoomable/pannable image lightbox overlay
│   │   ├── MarkdownRenderer.tsx  # Markdown rendering core (all plugins + alerts)
│   │   ├── Mermaid.tsx           # Mermaid diagram component
│   │   ├── SearchBar.tsx         # In-document full-text search (CSS Highlight API)
│   │   └── Sidebar.tsx           # Left-side TOC navigation (tree + drag-to-resize)
│   ├── hooks/
│   │   ├── useContentWidth.ts   # Reading width mode management (compact/standard/wide)
│   │   └── useTheme.ts          # Light/dark theme management
│   ├── styles/
│   │   └── index.css            # Global styles & CSS variable themes
│   └── utils/                   # Utility modules
└── src-tauri/                   # Tauri / Rust backend
    ├── Cargo.toml               # Rust dependencies
    ├── tauri.conf.json          # Tauri app config (window, permissions, file associations)
    ├── build.rs                 # Tauri build script
    ├── capabilities/            # Tauri v2 permission capabilities
    ├── src/
    │   └── main.rs              # Rust entry (file/dir watching, directory scan, native menu, file association)
    └── icons/                   # App icon assets
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/tools/install) >= 1.70
- Tauri v2 system dependencies (see [Tauri Prerequisites](https://tauri.app/start/prerequisites/))

## Development

```bash
# Install frontend dependencies
pnpm install

# Start development mode (launches Vite dev server + Tauri window)
pnpm tauri dev
```

In development mode, frontend changes are hot-reloaded via Vite HMR, and Rust code changes trigger automatic recompilation.

To debug the frontend only (without the Tauri window):

```bash
pnpm dev
# Open http://localhost:1420 in your browser
```

## Build & Package

```bash
# Production build (frontend + Rust compilation + installer packaging)
pnpm tauri build
```

Build artifacts are located at `src-tauri/target/release/bundle/`:

| Platform | Output | Path |
|----------|--------|------|
| macOS | `.app` + `.dmg` | `bundle/macos/` and `bundle/dmg/` |
| Windows | `.msi` + `.exe` | `bundle/msi/` and `bundle/nsis/` |
| Linux | `.deb` + `.AppImage` | `bundle/deb/` and `bundle/appimage/` |

### Cross-Compilation

Tauri builds for the current platform by default. For cross-compilation, add the corresponding Rust target:

```bash
# Example: Build for Apple Silicon on macOS
rustup target add aarch64-apple-darwin
pnpm tauri build --target aarch64-apple-darwin

# Example: Build for Intel on macOS
rustup target add x86_64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin

# Build Universal Binary (Intel + Apple Silicon)
pnpm tauri build --target universal-apple-darwin
```

### Customization

Edit the following fields in `src-tauri/tauri.conf.json`:

- `productName` — Application name
- `version` — Version number
- `identifier` — Unique app identifier (e.g. `com.yourname.mdviewer`)
- `bundle.icon` — App icons
- `bundle.fileAssociations` — Associated file extensions

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automatically builds and publishes releases for macOS (Apple Silicon + Intel), Windows (x64), and Linux (x64) when a version tag (`v*`) is pushed.

```bash
# Create and push a release tag
git tag v0.1.6
git push origin v0.1.6
```

## License

[Apache License 2.0](LICENSE)
