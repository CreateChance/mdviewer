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
  const [fileName, setFileName] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  const openFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
      });
      if (typeof selected === "string") {
        const content = await readTextFile(selected);
        setMarkdown(content);
        const name = selected.split(/[/\\]/).pop() || selected;
        setFileName(name);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  return (
    <div className={`app-layout ${resizing ? "resizing" : ""}`}>
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFile={openFile}
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
            <MarkdownRenderer content={markdown} />
          ) : (
            <div className="welcome">
              <div className="welcome-icon">📄</div>
              <p>打开一个 Markdown 文件开始阅读</p>
              <button className="welcome-open" onClick={openFile}>
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
