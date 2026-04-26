# Microsoft Learn 风格 Markdown 展示

这是一个展示 Microsoft Learn 风格 Markdown 渲染效果的测试文档。

## 提示框 (Alerts)

> [!NOTE]
> 这是一条备注信息。即使用户快速浏览，也应该注意到这条信息。

> [!TIP]
> 这是一条提示信息。帮助用户更好地完成任务的可选信息。

> [!IMPORTANT]
> 这是一条重要信息。用户成功所必需的关键信息。

> [!CAUTION]
> 这是一条注意信息。某个操作可能带来的负面后果。

> [!WARNING]
> 这是一条警告信息。某个操作必然带来的危险后果。

## 代码块

行内代码：使用 `npm install` 安装依赖，然后运行 `npm run dev` 启动开发服务器。

```typescript
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

```python
def fibonacci(n: int) -> list[int]:
    """生成斐波那契数列"""
    if n <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]
```

## 表格

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| 桌面框架 | [Tauri v1](https://v1.tauri.app/) | 轻量级桌面应用框架 |
| 前端 | React 19 + TypeScript | 现代前端技术栈 |
| 构建工具 | Vite 7 | 极速构建工具 |
| Markdown | react-markdown + remark-gfm | Markdown 解析与渲染 |
| 代码高亮 | rehype-highlight + highlight.js | 语法高亮支持 |
| 数学公式 | rehype-katex + KaTeX | LaTeX 数学公式渲染 |
| 图表 | Mermaid | 流程图与图表支持 |

## 引用块

> 这是一个普通的引用块。它通常以缩进和不同的背景色来渲染。
> 可以包含多行内容。

## 列表

### 无序列表

- 这是一个无序列表
- 支持嵌套结构
  - 二级列表项
  - 另一个二级列表项
    - 三级列表项
- 回到一级

### 有序列表

1. 第一步：安装依赖
2. 第二步：配置环境
   1. 配置数据库
   2. 配置缓存
3. 第三步：启动服务

### 任务列表

- [x] 完成基础 Markdown 渲染
- [x] 添加代码高亮支持
- [x] 添加 Microsoft Learn 风格提示框
- [ ] 添加更多自定义样式
- [ ] 性能优化

## 文本格式

这是 **粗体文本**，这是 *斜体文本*，这是 ***粗斜体文本***。

这是 ~~删除线文本~~。

## 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 分隔线

---

## 链接

- [Tauri 官方文档](https://v1.tauri.app/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

## 混合使用提示框和代码

> [!TIP]
> 使用以下命令快速创建新项目：

```bash
pnpm create tauri-app my-app
cd my-app
pnpm install
pnpm tauri dev
```

> [!WARNING]
> 在生产环境中请勿使用 `console.log` 进行调试，应使用专业的日志库。
