import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { open } from "@tauri-apps/api/shell";
import Mermaid from "./Mermaid";

const MD_EXTENSIONS = /\.(md|markdown|mdx)$/i;

interface MarkdownRendererProps {
  content: string;
  filePath: string;
  onNavigate: (path: string) => void;
}

function getHeadingId(children: React.ReactNode): string {
  const text = extractText(children);
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function resolveRelativePath(base: string, relative: string): string {
  // Get directory of current file
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

export default function MarkdownRenderer({ content, filePath, onNavigate }: MarkdownRendererProps) {
  const components = useMemo<Components>(() => ({
    a({ href, children, ...props }) {
      const handleClick = (e: React.MouseEvent) => {
        if (!href) return;

        // External links → system browser
        if (/^https?:\/\//.test(href)) {
          e.preventDefault();
          open(href);
          return;
        }

        // Relative markdown file links → navigate in app
        const cleanHref = href.split("#")[0]; // strip anchor
        if (cleanHref && MD_EXTENSIONS.test(cleanHref) && filePath) {
          e.preventDefault();
          const resolved = resolveRelativePath(filePath, cleanHref);
          onNavigate(resolved);
        }
      };
      return <a href={href} onClick={handleClick} {...props}>{children}</a>;
    },
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];
      const codeStr = String(children).replace(/\n$/, "");

      if (lang === "mermaid") {
        return <Mermaid chart={codeStr} />;
      }

      if (!className) {
        return <code className="inline-code" {...props}>{children}</code>;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    h1({ children, ...props }) {
      return <h1 id={getHeadingId(children)} {...props}>{children}</h1>;
    },
    h2({ children, ...props }) {
      return <h2 id={getHeadingId(children)} {...props}>{children}</h2>;
    },
    h3({ children, ...props }) {
      return <h3 id={getHeadingId(children)} {...props}>{children}</h3>;
    },
    h4({ children, ...props }) {
      return <h4 id={getHeadingId(children)} {...props}>{children}</h4>;
    },
    h5({ children, ...props }) {
      return <h5 id={getHeadingId(children)} {...props}>{children}</h5>;
    },
    h6({ children, ...props }) {
      return <h6 id={getHeadingId(children)} {...props}>{children}</h6>;
    },
  }), [filePath, onNavigate]);

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
