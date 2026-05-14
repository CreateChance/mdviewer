import { useEffect, useRef } from "react";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import type { UpdateResult } from "../utils/updateChecker";

interface UpdateDialogProps {
  visible: boolean;
  result: UpdateResult | null;
  checking: boolean;
  onClose: () => void;
}

export default function UpdateDialog({ visible, result, checking, onClose }: UpdateDialogProps) {
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

  return (
    <div className="about-overlay">
      <div className="about-dialog update-dialog" ref={dialogRef}>
        {checking ? (
          <>
            <h2>Check for Updates</h2>
            <p className="update-checking">Checking for updates...</p>
          </>
        ) : !result || result.status === "error" ? (
          <>
            <h2>Check for Updates</h2>
            <p className="update-error">Unable to check for updates. Please check your network connection.</p>
            <button className="about-close" onClick={onClose}>Close</button>
          </>
        ) : result.status === "no-release" ? (
          <>
            <h2>Check for Updates</h2>
            <p className="update-uptodate">No published releases found.</p>
            <button className="about-close" onClick={onClose}>OK</button>
          </>
        ) : result.status === "update" && result.info ? (
          <>
            <h2>Update Available</h2>
            <dl className="about-info">
              <dt>Current Version</dt>
              <dd>{result.info.currentVersion}</dd>
              <dt>Latest Version</dt>
              <dd>{result.info.latestVersion}</dd>
            </dl>
            <div className="update-actions">
              <button
                className="update-download"
                onClick={() => {
                  shellOpen(result.info!.releaseUrl);
                  onClose();
                }}
              >
                Download
              </button>
              <button className="about-close" onClick={onClose}>Later</button>
            </div>
          </>
        ) : (
          <>
            <h2>Check for Updates</h2>
            <p className="update-uptodate">You're up to date ({result.info?.currentVersion})</p>
            <button className="about-close" onClick={onClose}>OK</button>
          </>
        )}
      </div>
    </div>
  );
}
