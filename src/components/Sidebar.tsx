import { useEffect, useState, useCallback, useMemo, useRef } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocTreeNode extends TocItem {
  children: TocTreeNode[];
}

interface SidebarProps {
  markdown: string;
  collapsed: boolean;
  onToggle: () => void;
  onResizeStateChange: (resizing: boolean) => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 260;

/** Convert flat heading list into a nested tree based on heading levels. */
function buildTocTree(items: TocItem[]): TocTreeNode[] {
  const root: TocTreeNode[] = [];
  const stack: TocTreeNode[] = [];

  for (const item of items) {
    const node: TocTreeNode = { ...item, children: [] };

    // Pop stack until we find a parent with a smaller level
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}

function TocTreeItem({
  node,
  depth,
  activeId,
  onScrollTo,
}: {
  node: TocTreeNode;
  depth: number;
  activeId: string;
  onScrollTo: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li className="toc-tree-node">
      <div
        className={`toc-item ${activeId === node.id ? "active" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <span
            className="toc-toggle"
            onClick={() => setExpanded((p) => !p)}
            role="button"
            aria-label={expanded ? "折叠" : "展开"}
          >
            {expanded ? "▾" : "▸"}
          </span>
        ) : (
          <span className="toc-toggle-placeholder" />
        )}
        <button onClick={() => onScrollTo(node.id)}>{node.text}</button>
      </div>
      {hasChildren && expanded && (
        <ul className="toc-list">
          {node.children.map((child, i) => (
            <TocTreeItem
              key={`${child.id}-${i}`}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onScrollTo={onScrollTo}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({ markdown, collapsed, onToggle, onResizeStateChange }: SidebarProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Extract headings from markdown source
  useEffect(() => {
    const lines = markdown.split("\n");
    const items: TocItem[] = [];
    const idCount = new Map<string, number>();
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trimStart().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[*_`~\[\]]/g, "").trim();
        const base = text
          .toLowerCase()
          .replace(/[\s]+/g, "-")
          .replace(/[^\p{L}\p{N}_-]/gu, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const count = idCount.get(base) ?? 0;
        idCount.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count}`;
        items.push({ id, text, level });
      }
    }
    setToc(items);
  }, [markdown]);

  const tocTree = useMemo(() => buildTocTree(toc), [toc]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return;

    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20px 0px -80% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  // Drag resize logic
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    onResizeStateChange(true);
  }, [onResizeStateChange]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const sidebar = sidebarRef.current;
      if (!sidebar) return;
      const rect = sidebar.getBoundingClientRect();
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - rect.left));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setDragging(false);
      onResizeStateChange(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const container = document.querySelector(".content");
    if (container) {
      const elTop = el.getBoundingClientRect().top;
      const containerTop = container.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (elTop - containerTop) - 16,
        behavior: "smooth",
      });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveId(id);
  }, []);

  if (!markdown) return null;

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar ${collapsed ? "collapsed" : ""} ${dragging ? "dragging" : ""}`}
      style={collapsed ? undefined : { width, minWidth: width }}
    >
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "展开目录" : "收起目录"}>
        {collapsed ? "▶" : "◀"}
      </button>
      {!collapsed && (
        <>
          <nav className="toc">
            <h3 className="toc-title">目录</h3>
            <ul className="toc-list">
              {tocTree.map((node, i) => (
                <TocTreeItem
                  key={`${node.id}-${i}`}
                  node={node}
                  depth={0}
                  activeId={activeId}
                  onScrollTo={scrollTo}
                />
              ))}
            </ul>
          </nav>
          <div className="sidebar-resizer" onMouseDown={onMouseDown} />
        </>
      )}
    </aside>
  );
}
