import { useState, useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/api/dialog";
import { readTextFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { useTheme } from "./hooks/useTheme";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import MarkdownRenderer from "./components/MarkdownRenderer";
import FileExplorer from "./components/FileExplorer";
import SearchBar from "./components/SearchBar";

function getDir(filePath: string): string {
  const sep = filePath.includes("\\") ? "\\" : "/";
  return filePath.substring(0, filePath.lastIndexOf(sep));
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [markdown, setMarkdown] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [explorerRoot, setExplorerRoot] = useState("");
  const [explorerFiles, setExplorerFiles] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const explorerRootRef = useRef(explorerRoot);
  explorerRootRef.current = explorerRoot;

  const scanDir = useCallback(async (dir: string) => {
    try {
      const files = await invoke<string[]>("scan_md_files", { dir });
      setExplorerRoot(dir);
      setExplorerFiles(files);
      // Start watching the directory for changes
      await invoke("watch_dir", { dir });
    } catch (err) {
      console.error("Failed to scan directory:", err);
    }
  }, []);

  const openFilePath = useCallback(async (path: string) => {
    try {
      const content = await readTextFile(path);
      setMarkdown(content);
      setFilePath(path);
      const name = path.split(/[/\\]/).pop() || path;
      setFileName(name);
      await invoke("watch_file", { path });
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  // Listen for file-changed events from Rust backend
  useEffect(() => {
    const unlisten = listen<string>("file-changed", async () => {
      const current = filePathRef.current;
      if (!current) return;
      try {
        const content = await readTextFile(current);
        setMarkdown(content);
      } catch (err) {
        console.error("Failed to reload file:", err);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Listen for directory changes to refresh file explorer
  useEffect(() => {
    const unlisten = listen<string>("dir-changed", async () => {
      const root = explorerRootRef.current;
      if (!root) return;
      try {
        const files = await invoke<string[]>("scan_md_files", { dir: root });
        setExplorerFiles(files);
      } catch (err) {
        console.error("Failed to rescan directory:", err);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const openFileDialog = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
      });
      if (typeof selected === "string") {
        await openFilePath(selected);
        // Also scan the parent directory for the file explorer
        await scanDir(getDir(selected));
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openFilePath, scanDir]);

  const openFolderDialog = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        await scanDir(selected);
        // Clear current file view when opening a new folder
        setMarkdown("");
        setFilePath("");
        setFileName("");
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  }, [scanDir]);

  const handleExplorerSelect = useCallback(async (path: string) => {
    await openFilePath(path);
  }, [openFilePath]);

  const [hoveredLink, setHoveredLink] = useState("");

  const hasExplorer = explorerFiles.length > 0;

  return (
    <div className={`app-layout ${resizing ? "resizing" : ""}`}>
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFile={openFileDialog}
        onOpenFolder={openFolderDialog}
        fileName={fileName}
      />
      <div className="app-body">
        {markdown && (
          <Sidebar
            markdown={markdown}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((p) => !p)}
            onResizeStateChange={setResizing}
          />
        )}
        <main className="content">
          {markdown ? (
            <>
              <MarkdownRenderer
                content={markdown}
                filePath={filePath}
                onNavigate={openFilePath}
                onHoverLink={setHoveredLink}
              />
              <SearchBar
                containerSelector=".content"
                contentSelector=".markdown-body"
              />
            </>
          ) : (
            <div className="welcome">
              <div className="welcome-icon">📄</div>
              <p>{hasExplorer ? "从右侧文件列表中选择一个文件" : "打开一个 Markdown 文件或文件夹开始阅读"}</p>
              {!hasExplorer && (
                <div className="welcome-actions">
                  <button className="welcome-open" onClick={openFileDialog}>打开文件</button>
                  <button className="welcome-open" onClick={openFolderDialog}>打开文件夹</button>
                </div>
              )}
            </div>
          )}
        </main>
        {hasExplorer && (
          <FileExplorer
            files={explorerFiles}
            rootDir={explorerRoot}
            currentFile={filePath}
            collapsed={explorerCollapsed}
            onToggle={() => setExplorerCollapsed((p) => !p)}
            onSelectFile={handleExplorerSelect}
            onResizeStateChange={setResizing}
          />
        )}
      </div>
      {hoveredLink && (
        <div className="link-status-bar">{hoveredLink}</div>
      )}
    </div>
  );
}

export default App;
