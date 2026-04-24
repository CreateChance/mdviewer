import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";

let mermaidId = 0;

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const idRef = useRef(`mermaid-${++mermaidId}`);
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "default",
      securityLevel: "loose",
    });

    mermaid
      .render(idRef.current, chart.trim())
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setSvg(`<pre class="mermaid-error">Mermaid diagram error</pre>`);
      });

    return () => { cancelled = true; };
  }, [chart]);

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    setTranslate((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [translate]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTranslate({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  return (
    <>
      <div
        ref={containerRef}
        className="mermaid-container"
        onClick={openFullscreen}
        title="Click to zoom"
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="mermaid-zoom-hint">🔍</span>
      </div>

      {fullscreen && (
        <div
          className="mermaid-overlay"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div className="mermaid-overlay-toolbar">
            <button onClick={() => setScale((s) => Math.min(5, s + 0.25))}>＋</button>
            <span className="mermaid-overlay-scale">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.max(0.2, s - 0.25))}>－</button>
            <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>Reset</button>
            <button onClick={closeFullscreen}>✕</button>
          </div>
          <div
            className="mermaid-overlay-content"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </>
  );
}
