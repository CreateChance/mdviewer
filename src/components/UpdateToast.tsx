import { useEffect, useState } from "react";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import type { UpdateInfo } from "../utils/updateChecker";

interface UpdateToastProps {
  updateInfo: UpdateInfo | null;
  onDismiss: () => void;
}

export default function UpdateToast({ updateInfo, onDismiss }: UpdateToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (updateInfo?.hasUpdate) {
      // Trigger enter animation
      requestAnimationFrame(() => setVisible(true));
    }
  }, [updateInfo]);

  if (!updateInfo?.hasUpdate) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200); // Wait for exit animation
  };

  return (
    <div className={`update-toast ${visible ? "update-toast-visible" : ""}`}>
      <div className="update-toast-content">
        <span className="update-toast-icon">🎉</span>
        <div className="update-toast-text">
          <strong>Update Available</strong>
          <span>v{updateInfo.latestVersion}</span>
        </div>
      </div>
      <div className="update-toast-actions">
        <button
          className="update-toast-download"
          onClick={() => {
            shellOpen(updateInfo.releaseUrl);
            handleDismiss();
          }}
        >
          Download
        </button>
        <button className="update-toast-dismiss" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
