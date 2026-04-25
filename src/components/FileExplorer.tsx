import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FileExplorerProps {
  files: string[];
  rootDir: string;
  currentFile: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelectFile: (path: string) => void;
  onResizeStateChange: (resizing: boolean) => void;
}

interface TreeNode {
  name: string;
  fullPath?: string; // only for files
  children: TreeNode[];
}

function buildTree(files: string[], rootDir: string): TreeNode[] {
  const root: TreeNode = { name: "", children: [] };
  const sep = rootDir.includes("\\") ? "\\" : "/";
  const prefix = rootDir.endsWith(sep) ? rootDir : rootDir + sep;

  for (const file of files) {
    const relative = file.startsWith(prefix) ? file.slice(prefix.length) : file;
    const parts = relative.split(/[/\\]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = { name: part, children: [] };
        if (isFile) child.fullPath = file;
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: directories first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const aIsDir = a.children.length > 0 && !a.fullPath;
      const bIsDir = b.children.length > 0 && !b.fullPath;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root.children);

  return root.children;
}

function TreeItem({
  node,
  depth,
  currentFile,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  currentFile: string;
  onSelectFile: (path: string) => void;
}) {
  const isDir = !node.fullPath && node.children.length > 0;
  const [expanded, setExpanded] = useState(true);
  const isActive = node.fullPath === currentFile;

  if (isDir) {
    return (
      <li className="fe-dir">
        <button
          className="fe-dir-btn"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setExpanded((p) => !p)}
        >
          <span className="fe-icon fe-icon-toggle">{expanded ? "▾" : "▸"}</span>
          <span className="fe-dir-name">{node.name}</span>
        </button>
        {expanded && (
          <ul className="fe-list">
            {node.children.map((child) => (
              <TreeItem
                key={child.fullPath || child.name}
                node={child}
                depth={depth + 1}
                currentFile={currentFile}
                onSelectFile={onSelectFile}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className={`fe-file ${isActive ? "active" : ""}`}>
      <button
        className="fe-file-btn"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => node.fullPath && onSelectFile(node.fullPath)}
        title={node.fullPath}
      >
        <span className="fe-icon">📄</span>
        <span className="fe-file-name">{node.name}</span>
      </button>
    </li>
  );
}

const FE_MIN_WIDTH = 180;
const FE_MAX_WIDTH = 480;
const FE_DEFAULT_WIDTH = 240;

export default function FileExplorer({
  files,
  rootDir,
  currentFile,
  collapsed,
  onToggle,
  onSelectFile,
  onResizeStateChange,
}: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files, rootDir), [files, rootDir]);
  const [width, setWidth] = useState(FE_DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const explorerRef = useRef<HTMLElement>(null);

  const dirName = useMemo(() => {
    const sep = rootDir.includes("\\") ? "\\" : "/";
    return rootDir.split(sep).pop() || rootDir;
  }, [rootDir]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    onResizeStateChange(true);
  }, [onResizeStateChange]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const explorer = explorerRef.current;
      if (!explorer) return;
      const rect = explorer.getBoundingClientRect();
      // Right-side panel: width = right edge - mouse position
      const newWidth = Math.min(FE_MAX_WIDTH, Math.max(FE_MIN_WIDTH, rect.right - e.clientX));
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
  }, [dragging, onResizeStateChange]);

  return (
    <aside
      ref={explorerRef}
      className={`file-explorer ${collapsed ? "collapsed" : ""} ${dragging ? "dragging" : ""}`}
      style={collapsed ? undefined : { width, minWidth: width }}
    >
      <button
        className="fe-toggle"
        onClick={onToggle}
        title={collapsed ? "展开文件" : "收起文件"}
      >
        {collapsed ? "◀" : "▶"}
      </button>
      {!collapsed && (
        <>
          <div className="fe-resizer" onMouseDown={onMouseDown} />
          <nav className="fe-nav">
            <h3 className="fe-title" title={rootDir}>{dirName}</h3>
            <ul className="fe-list fe-root">
              {tree.map((node) => (
                <TreeItem
                  key={node.fullPath || node.name}
                  node={node}
                  depth={0}
                  currentFile={currentFile}
                  onSelectFile={onSelectFile}
                />
              ))}
            </ul>
          </nav>
        </>
      )}
    </aside>
  );
}
