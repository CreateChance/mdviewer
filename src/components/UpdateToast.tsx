import { useEffect, useState } from "react";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import type { UpdateResult } from "../utils/updateChecker";

interface UpdateToastProps {
  result: UpdateResult | null;
  onDismiss: () => void;
}

export default function UpdateToast({ result, onDismiss }: UpdateToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [result]);

  if (!result) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div className={`update-toast ${visible ? "update-toast-visible" : ""}`}>
      {result.status === "update" && result.info ? (
        <>
          <div className="update-toast-content">
            <span className="update-toast-icon">🎉</span>
            <div className="update-toast-text">
              <strong>Update Available</strong>
              <span>Current: v{result.info.currentVersion} → Latest: v{result.info.latestVersion}</span>
            </div>
          </div>
          <div className="update-toast-actions">
            <button
              className="update-toast-download"
              onClick={() => {
                shellOpen(result.info!.releaseUrl);
                handleDismiss();
              }}
            >
              Download
            </button>
            <button className="update-toast-dismiss" onClick={handleDismiss}>
              Later
            </button>
          </div>
        </>
      ) : result.status === "uptodate" && result.info ? (
        <>
          <div className="update-toast-content">
            <span className="update-toast-icon">✅</span>
            <div className="update-toast-text">
              <strong>You're Up to Date</strong>
              <span>Current version: v{result.info.currentVersion}</span>
            </div>
          </div>
          <div className="update-toast-actions">
            <button className="update-toast-dismiss" onClick={handleDismiss}>OK</button>
          </div>
        </>
      ) : result.status === "no-release" ? (
        <>
          <div className="update-toast-content">
            <span className="update-toast-icon">ℹ️</span>
            <div className="update-toast-text">
              <strong>No Releases Found</strong>
              <span>No published releases available</span>
            </div>
          </div>
          <div className="update-toast-actions">
            <button className="update-toast-dismiss" onClick={handleDismiss}>OK</button>
          </div>
        </>
      ) : (
        <>
          <div className="update-toast-content">
            <span className="update-toast-icon">⚠️</span>
            <div className="update-toast-text">
              <strong>Update Check Failed</strong>
              <span>Please check your network connection</span>
            </div>
          </div>
          <div className="update-toast-actions">
            <button className="update-toast-dismiss" onClick={handleDismiss}>OK</button>
          </div>
        </>
      )}
    </div>
  );
}
