interface ToolbarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenFile: () => void;
  fileName: string;
}

export default function Toolbar({ theme, onToggleTheme, onOpenFile, fileName }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={onOpenFile} title="打开文件">
          📂
        </button>
        <span className="toolbar-filename">{fileName || "MD Viewer"}</span>
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={onToggleTheme} title="切换主题">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </header>
  );
}
