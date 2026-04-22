# MD Viewer

一个基于 Tauri + React + TypeScript 构建的极简桌面 Markdown 阅读器。

## 功能特性

- **Markdown 渲染** — 基于 react-markdown，支持 GFM（表格、任务列表、删除线等）和 Emoji
- **目录导航** — 左侧自动生成文档目录，点击跳转，滚动时高亮当前章节，支持拖拽调整宽度
- **代码高亮** — 基于 highlight.js，自动识别语言并着色
- **数学公式** — 基于 KaTeX，支持行内公式和块级公式
- **Mermaid 图表** — 支持流程图、时序图、甘特图等各类图表
- **主题切换** — 浅色 / 深色主题一键切换，自动记忆偏好

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri v1](https://v1.tauri.app/) |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| Markdown | react-markdown + remark-gfm + remark-math |
| 代码高亮 | rehype-highlight + highlight.js |
| 数学公式 | rehype-katex + KaTeX |
| 图表 | Mermaid |
| 包管理 | pnpm |

## 项目结构

```
mdviewer/
├── index.html                  # 入口 HTML
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json               # TypeScript 配置
├── tsconfig.node.json          # Node 端 TS 配置（Vite 用）
├── vite.config.ts              # Vite 配置
├── public/                     # 静态资源
├── src/                        # 前端源码
│   ├── main.tsx                # 应用入口，引入全局样式
│   ├── App.tsx                 # 主应用组件，文件打开 & 布局编排
│   ├── components/
│   │   ├── MarkdownRenderer.tsx  # Markdown 渲染核心（集成所有插件）
│   │   ├── Mermaid.tsx           # Mermaid 图表渲染组件
│   │   ├── Sidebar.tsx           # 左侧目录导航（TOC + 拖拽调宽）
│   │   └── Toolbar.tsx           # 顶部工具栏（打开文件 & 主题切换）
│   ├── hooks/
│   │   └── useTheme.ts          # 浅色/深色主题管理
│   └── styles/
│       └── index.css            # 全局样式 & CSS 变量主题
└── src-tauri/                  # Tauri / Rust 后端
    ├── Cargo.toml              # Rust 依赖配置
    ├── tauri.conf.json         # Tauri 应用配置（窗口、权限等）
    ├── build.rs                # Tauri 构建脚本
    ├── src/
    │   └── main.rs             # Rust 入口
    └── icons/                  # 应用图标资源
```

## 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/tools/install) >= 1.70
- Tauri v1 系统依赖（参考 [Tauri 前置条件](https://v1.tauri.app/v1/guides/getting-started/prerequisites)）

## 开发

```bash
# 安装前端依赖
pnpm install

# 启动开发模式（同时启动 Vite dev server 和 Tauri 窗口）
pnpm tauri dev
```

开发模式下，前端代码修改会通过 Vite HMR 热更新，Rust 代码修改会自动重新编译。

如果只需要调试前端（不启动 Tauri 窗口）：

```bash
pnpm dev
# 浏览器访问 http://localhost:1420
```

## 构建与打包

```bash
# 构建生产版本（前端 + Rust 编译 + 打包安装程序）
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`，根据操作系统不同会生成：

| 平台 | 产物 | 路径 |
|------|------|------|
| macOS | `.app` + `.dmg` | `bundle/macos/` 和 `bundle/dmg/` |
| Windows | `.msi` + `.exe` | `bundle/msi/` 和 `bundle/nsis/` |
| Linux | `.deb` + `.AppImage` | `bundle/deb/` 和 `bundle/appimage/` |

### 指定目标平台

Tauri 默认为当前系统构建。如需交叉编译，需配置对应的 Rust target：

```bash
# 示例：macOS 上构建 Apple Silicon 版本
rustup target add aarch64-apple-darwin
pnpm tauri build --target aarch64-apple-darwin

# 示例：macOS 上构建 Intel 版本
rustup target add x86_64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin

# 同时构建 Universal Binary（Intel + Apple Silicon）
pnpm tauri build --target universal-apple-darwin
```

### 自定义应用信息

编辑 `src-tauri/tauri.conf.json` 中的以下字段：

- `package.productName` — 应用名称
- `package.version` — 版本号
- `tauri.bundle.identifier` — 应用唯一标识符（如 `com.yourname.mdviewer`）
- `tauri.bundle.icon` — 应用图标

### CI/CD 自动发布

可参考 Tauri 官方的 [GitHub Actions 发布指南](https://v1.tauri.app/v1/guides/building/cross-platform) 配置多平台自动构建与发布。

## 许可证

[Apache License 2.0](LICENSE)
