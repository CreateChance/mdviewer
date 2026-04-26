import { useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import { open } from "@tauri-apps/api/shell";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import Mermaid from "./Mermaid";
import ImageLightbox from "./ImageLightbox";

const MD_EXTENSIONS = /\.(md|markdown|mdx)$/i;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromNode(node: any): string {
  let text = "";
  if (node.children) {
    for (const child of node.children) {
      if (child.type === "text") {
        text += child.value;
      } else if (child.children) {
        text += extractTextFromNode(child);
      }
    }
  }
  return text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function visitHeadings(node: any, idCount: Map<string, number>) {
  if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
    const text = extractTextFromNode(node);
    const base = slugify(text);
    const count = idCount.get(base) ?? 0;
    idCount.set(base, count + 1);
    if (!node.properties) node.properties = {};
    node.properties.id = count === 0 ? base : `${base}-${count}`;
  }
  if (node.children) {
    for (const child of node.children) {
      visitHeadings(child, idCount);
    }
  }
}

function rehypeSlugify() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    visitHeadings(tree, new Map());
  };
}

/**
 * Rehype plugin: strip hljs class and flatten spans for code blocks
 * that have no language specified (only have "hljs" class, no "language-*").
 */
function rehypeStripNoLang() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function flattenToText(node: any): string {
    if (node.type === "text") return node.value || "";
    if (node.children) return node.children.map(flattenToText).join("");
    return "";
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function visit(node: any) {
    if (
      node.type === "element" &&
      node.tagName === "code" &&
      node.properties?.className
    ) {
      const classes: string[] = node.properties.className;
      const hasLang = classes.some((c: string) => c.startsWith("language-"));
      if (!hasLang) {
        // Strip all classes and flatten children to plain text
        delete node.properties.className;
        const text = flattenToText(node);
        node.children = [{ type: "text", value: text }];
      }
    }
    if (node.children) {
      for (const child of node.children) visit(child);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => visit(tree);
}

function resolveRelativePath(base: string, relative: string): string {
  const sep = base.includes("\\") ? "\\" : "/";
  const dir = base.substring(0, base.lastIndexOf(sep));
  const parts = dir.split(sep);

  for (const segment of relative.split("/")) {
    if (segment === "..") {
      parts.pop();
    } else if (segment !== "." && segment !== "") {
      parts.push(segment);
    }
  }
  return parts.join(sep);
}

/* ── Microsoft Learn-style alert preprocessing ── */
const ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "CAUTION", "WARNING"] as const;
type AlertType = (typeof ALERT_TYPES)[number];

const ALERT_META: Record<AlertType, { icon: string; label: string }> = {
  NOTE:      { icon: "ℹ️",  label: "备注" },
  TIP:       { icon: "💡", label: "提示" },
  IMPORTANT: { icon: "❗", label: "重要" },
  CAUTION:   { icon: "⚠️",  label: "注意" },
  WARNING:   { icon: "🚨", label: "警告" },
};

/**
 * Pre-process markdown to convert Microsoft Learn-style alerts
 * `> [!NOTE]` → custom HTML div blocks that rehype-raw will pass through.
 */
function preprocessAlerts(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].replace(/^>\s?/, "").trim();
    const alertMatch = trimmed.match(/^\[!(\w+)\]$/);

    if (alertMatch && lines[i].trimStart().startsWith(">")) {
      const type = alertMatch[1].toUpperCase() as AlertType;
      if (ALERT_TYPES.includes(type)) {
        const meta = ALERT_META[type];
        const bodyLines: string[] = [];
        i++; // skip the [!TYPE] line

        // Collect subsequent blockquote lines
        while (i < lines.length && /^>/.test(lines[i])) {
          bodyLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }

        const body = bodyLines.join("\n").trim();
        out.push(`<div class="alert alert-${type.toLowerCase()}">`);
        out.push(`<div class="alert-heading"><span class="alert-icon">${meta.icon}</span><span class="alert-label">${meta.label}</span></div>`);
        out.push(`<div class="alert-body">\n\n${body}\n\n</div>`);
        out.push(`</div>`);
        out.push(""); // blank line after
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n");
}

/* ── Extract plain text from React children (handles rehype-highlight spans) ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props?.children) return extractText(node.props.children);
  return "";
}

/* ── CodeBlock with copy / expand / collapse ── */
function CodeBlock({
  lang,
  codeText,
  onCopy,
  children,
}: {
  lang: string;
  codeText: string;
  onCopy: (text: string) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded]);

  const handleCopy = () => {
    onCopy(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`code-block-wrapper ${collapsed ? "code-collapsed" : ""} ${expanded ? "code-expanded" : ""}`}>
      <div className="code-block-header">
        {lang && <span className="code-block-lang">{lang}</span>}
        {!lang && <span />}
        <div className="code-block-actions">
          <button
            className="code-action-btn"
            onClick={handleCopy}
            title={copied ? "已复制" : "复制代码"}
            aria-label="复制代码"
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 10.5H3a1.5 1.5 0 01-1.5-1.5V3A1.5 1.5 0 013 1.5h6A1.5 1.5 0 0110.5 3v.5" stroke="currentColor" strokeWidth="1.4"/></svg>
            )}
          </button>
          <button
            className="code-action-btn"
            onClick={() => setExpanded((p) => !p)}
            title={expanded ? "退出全屏" : "全屏"}
            aria-label={expanded ? "退出全屏" : "全屏"}
          >
            {expanded ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2v4h4M6 14v-4H2M10 6L14.5 1.5M6 10L1.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M14 10v4h-4M2 2l4.5 4.5M14 14l-4.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
          <button
            className="code-action-btn"
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? "展开" : "折叠"}
            aria-label={collapsed ? "展开" : "折叠"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={collapsed ? "code-chevron-collapsed" : ""}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {!collapsed && <div className="code-block-body">{children}</div>}
      {expanded && createPortal(
        <div className="code-expanded-overlay" onClick={() => setExpanded(false)} />,
        document.body
      )}
    </div>
  );
}

export default function MarkdownRenderer({ content, filePath, onNavigate }: MarkdownRendererProps) {
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);

  const processedContent = useMemo(() => preprocessAlerts(content), [content]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const components = useMemo<Components>(() => ({
    a({ href, children, ...props }) {
      const handleClick = (e: React.MouseEvent) => {
        if (!href) return;

        if (/^https?:\/\//.test(href)) {
          e.preventDefault();
          open(href);
          return;
        }

        const cleanHref = href.split("#")[0];
        if (cleanHref && MD_EXTENSIONS.test(cleanHref) && filePath) {
          e.preventDefault();
          const resolved = resolveRelativePath(filePath, cleanHref);
          onNavigate(resolved);
        }
      };
      return <a href={href} onClick={handleClick} {...props}>{children}</a>;
    },
    code({ className, children, node, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];

      if (lang === "mermaid") {
        const codeStr = String(children).replace(/\n$/, "");
        return <Mermaid chart={codeStr} />;
      }

      // No language specified
      if (!lang) {
        // Check if inside <pre> (block code) — don't add inline-code class
        const isBlock = node?.position && String(children).includes("\n");
        if (isBlock) {
          return <code {...props}>{children}</code>;
        }
        return <code className="inline-code" {...props}>{children}</code>;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre({ children, ...props }) {
      // Extract code text for copy button
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = (children as any);
      const codeText = extractText(child?.props?.children).replace(/\n$/, "");
      // Extract language label
      let lang = "";
      if (child?.props?.className) {
        const m = /language-(\w+)/.exec(child.props.className);
        if (m) lang = m[1];
      }
      // Don't wrap mermaid blocks
      if (lang === "mermaid") {
        return <pre {...props}>{children}</pre>;
      }
      return (
        <CodeBlock lang={lang} codeText={codeText} onCopy={handleCopy}>
          <pre {...props}>{children}</pre>
        </CodeBlock>
      );
    },
    img({ src, alt, ...props }) {
      let resolvedSrc = src || "";
      if (resolvedSrc && !/^(https?:\/\/|data:)/.test(resolvedSrc) && filePath) {
        const absPath = resolveRelativePath(filePath, resolvedSrc);
        resolvedSrc = convertFileSrc(absPath);
      }
      return (
        <img
          src={resolvedSrc}
          alt={alt}
          className="md-img-zoomable"
          onClick={() => setLightboxSrc({ src: resolvedSrc, alt: alt || "" })}
          {...props}
        />
      );
    },
  }), [filePath, onNavigate, handleCopy]);

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGemoji, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSlugify, rehypeKatex, [rehypeHighlight, { detect: false }], rehypeStripNoLang]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc.src}
          alt={lightboxSrc.alt}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </article>
  );
}
