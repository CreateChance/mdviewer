import { useState, useCallback } from "react";

export type ContentWidth = "compact" | "standard" | "wide";

const WIDTHS: ContentWidth[] = ["compact", "standard", "wide"];

const LABELS: Record<ContentWidth, string> = {
  compact: "紧凑",
  standard: "标准",
  wide: "宽屏",
};

const ICONS: Record<ContentWidth, string> = {
  compact: "↔",
  standard: "⇔",
  wide: "⬌",
};

const STORAGE_KEY = "md-viewer-content-width";

export function useContentWidth() {
  const [contentWidth, setContentWidth] = useState<ContentWidth>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ContentWidth | null;
    if (saved && WIDTHS.includes(saved)) return saved;
    return "compact";
  });

  const cycleWidth = useCallback(() => {
    setContentWidth((prev) => {
      const idx = WIDTHS.indexOf(prev);
      const next = WIDTHS[(idx + 1) % WIDTHS.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return {
    contentWidth,
    cycleWidth,
    label: LABELS[contentWidth],
    icon: ICONS[contentWidth],
  };
}
