import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let mermaidId = 0;

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const idRef = useRef(`mermaid-${++mermaidId}`);

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

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
