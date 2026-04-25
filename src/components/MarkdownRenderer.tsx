import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);

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
  }), [filePath, onNavigate]);

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSlugify, rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
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
