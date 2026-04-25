import { useState, useCallback, useEffect, useRef } from "react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="img-lightbox-overlay"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="img-lightbox-toolbar">
        <button onClick={() => setScale((s) => Math.min(5, s + 0.25))}>＋</button>
        <span className="img-lightbox-scale">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.max(0.2, s - 0.25))}>－</button>
        <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>Reset</button>
        <button onClick={onClose}>✕</button>
      </div>
      <img
        className="img-lightbox-content"
        src={src}
        alt={alt}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
        draggable={false}
      />
    </div>
  );
}
