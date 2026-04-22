import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import Mermaid from "./Mermaid";

interface MarkdownRendererProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    const codeStr = String(children).replace(/\n$/, "");

    // Mermaid diagram
    if (lang === "mermaid") {
      return <Mermaid chart={codeStr} />;
    }

    // Inline code (no language class, no block)
    if (!className) {
      return <code className="inline-code" {...props}>{children}</code>;
    }

    // Block code — rehype-highlight handles syntax highlighting
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // Generate IDs for headings to enable TOC navigation
  h1({ children, ...props }) {
    const id = getHeadingId(children);
    return <h1 id={id} {...props}>{children}</h1>;
  },
  h2({ children, ...props }) {
    const id = getHeadingId(children);
    return <h2 id={id} {...props}>{children}</h2>;
  },
  h3({ children, ...props }) {
    const id = getHeadingId(children);
    return <h3 id={id} {...props}>{children}</h3>;
  },
  h4({ children, ...props }) {
    const id = getHeadingId(children);
    return <h4 id={id} {...props}>{children}</h4>;
  },
  h5({ children, ...props }) {
    const id = getHeadingId(children);
    return <h5 id={id} {...props}>{children}</h5>;
  },
  h6({ children, ...props }) {
    const id = getHeadingId(children);
    return <h6 id={id} {...props}>{children}</h6>;
  },
};

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

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
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
