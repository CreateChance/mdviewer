import { useEffect, useState, useCallback, useRef } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
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
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
        items.push({ id, text, level });
      }
    }
    setToc(items);
  }, [markdown]);

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
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  if (!markdown) return null;

  const minLevel = toc.length > 0 ? Math.min(...toc.map((t) => t.level)) : 1;

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
              {toc.map((item, i) => (
                <li
                  key={`${item.id}-${i}`}
                  className={`toc-item ${activeId === item.id ? "active" : ""}`}
                  style={{ paddingLeft: `${(item.level - minLevel) * 14 + 8}px` }}
                >
                  <button onClick={() => scrollTo(item.id)}>{item.text}</button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-resizer" onMouseDown={onMouseDown} />
        </>
      )}
    </aside>
  );
}
