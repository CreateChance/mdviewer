import { useState, useCallback } from "react";
import { open } from "@tauri-apps/api/dialog";
import { readTextFile } from "@tauri-apps/api/fs";
import { useTheme } from "./hooks/useTheme";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import MarkdownRenderer from "./components/MarkdownRenderer";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [markdown, setMarkdown] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  const openFilePath = useCallback(async (path: string) => {
    try {
      const content = await readTextFile(path);
      setMarkdown(content);
      setFilePath(path);
      const name = path.split(/[/\\]/).pop() || path;
      setFileName(name);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  const openFileDialog = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
      });
      if (typeof selected === "string") {
        await openFilePath(selected);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openFilePath]);

  return (
    <div className={`app-layout ${resizing ? "resizing" : ""}`}>
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFile={openFileDialog}
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
            <MarkdownRenderer
              content={markdown}
              filePath={filePath}
              onNavigate={openFilePath}
            />
          ) : (
            <div className="welcome">
              <div className="welcome-icon">📄</div>
              <p>打开一个 Markdown 文件开始阅读</p>
              <button className="welcome-open" onClick={openFileDialog}>
                打开文件
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
