import { useEffect, useRef } from "react";
import { open as shellOpen } from "@tauri-apps/plugin-shell";

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutDialog({ visible, onClose }: AboutDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible, onClose]);

  if (!visible) return null;

  const version = __APP_VERSION__;
  const buildTime = new Date(__BUILD_TIME__).toLocaleString();
  const githubUrl = "https://github.com/CreateChance/mdviewer";

  return (
    <div className="about-overlay">
      <div className="about-dialog" ref={dialogRef}>
        <h2>MD Viewer</h2>
        <p className="about-desc">A lightweight, fast Markdown reader for your desktop.</p>
        <dl className="about-info">
          <dt>Version</dt>
          <dd>{version}</dd>
          <dt>Built at</dt>
          <dd>{buildTime}</dd>
          <dt>Developer</dt>
          <dd>createchance</dd>
          <dt>GitHub</dt>
          <dd>
            <a
              href={githubUrl}
              onClick={(e) => {
                e.preventDefault();
                shellOpen(githubUrl);
              }}
            >
              {githubUrl}
            </a>
          </dd>
        </dl>
        <button className="about-close" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
