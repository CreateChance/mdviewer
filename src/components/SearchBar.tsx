import { useCallback, useEffect, useRef, useState } from "react";

interface SearchBarProps {
  /** The scrollable container to search within */
  containerSelector: string;
  /** The content root to search text in */
  contentSelector: string;
}

/** Find all text match ranges inside a container element. */
function findMatches(root: Element, query: string): Range[] {
  if (!query) return [];

  const ranges: Range[] = [];
  const lower = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent?.toLowerCase() ?? "";
    let start = 0;
    while (true) {
      const idx = text.indexOf(lower, start);
      if (idx === -1) break;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + query.length);
      ranges.push(range);
      start = idx + 1;
    }
  }
  return ranges;
}

const HIGHLIGHT_CLASS = "search-highlight";
const HIGHLIGHT_ACTIVE_CLASS = "search-highlight-active";

export default function SearchBar({ containerSelector, contentSelector }: SearchBarProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);

  // Clear all <mark> wrappers
  const clearHighlights = useCallback(() => {
    for (const mark of marksRef.current) {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
      }
    }
    marksRef.current = [];
  }, []);

  // Apply <mark> wrappers for all matches
  const applyHighlights = useCallback((ranges: Range[], activeIdx: number) => {
    clearHighlights();
    const markEls: HTMLElement[] = [];

    // Wrap ranges in reverse order to preserve earlier range positions
    for (let i = ranges.length - 1; i >= 0; i--) {
      const range = ranges[i];
      try {
        const mark = document.createElement("mark");
        mark.className = i === activeIdx
          ? `${HIGHLIGHT_CLASS} ${HIGHLIGHT_ACTIVE_CLASS}`
          : HIGHLIGHT_CLASS;
        range.surroundContents(mark);
        markEls.unshift(mark);
      } catch {
        // surroundContents can fail if range crosses element boundaries
      }
    }
    marksRef.current = markEls;
  }, [clearHighlights]);

  // Scroll active match into view
  const scrollToMatch = useCallback((idx: number) => {
    const mark = marksRef.current[idx];
    if (!mark) return;

    // Update active class
    for (let i = 0; i < marksRef.current.length; i++) {
      marksRef.current[i].className = i === idx
        ? `${HIGHLIGHT_CLASS} ${HIGHLIGHT_ACTIVE_CLASS}`
        : HIGHLIGHT_CLASS;
    }

    const container = document.querySelector(containerSelector);
    if (container) {
      const markTop = mark.getBoundingClientRect().top;
      const containerRect = container.getBoundingClientRect();
      const offset = markTop - containerRect.top - containerRect.height / 3;
      container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
    }
  }, [containerSelector]);

  // Execute search
  const doSearch = useCallback((searchQuery: string) => {
    const content = document.querySelector(contentSelector);
    if (!content || !searchQuery) {
      setMatches([]);
      setCurrentIdx(-1);
      clearHighlights();
      return;
    }

    clearHighlights();

    const found = findMatches(content, searchQuery);
    setMatches(found);

    if (found.length > 0) {
      setCurrentIdx(0);
      applyHighlights(found, 0);
      requestAnimationFrame(() => {
        const mark = marksRef.current[0];
        if (mark) {
          const container = document.querySelector(containerSelector);
          if (container) {
            const markTop = mark.getBoundingClientRect().top;
            const containerRect = container.getBoundingClientRect();
            const offset = markTop - containerRect.top - containerRect.height / 3;
            container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
          }
        }
      });
    } else {
      setCurrentIdx(-1);
    }
  }, [contentSelector, containerSelector, clearHighlights, applyHighlights]);

  // Clear highlights when search bar is hidden
  useEffect(() => {
    if (!visible) {
      clearHighlights();
      setMatches([]);
      setCurrentIdx(-1);
    }
  }, [visible, clearHighlights]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentIdx + 1) % matches.length;
    setCurrentIdx(next);
    scrollToMatch(next);
  }, [matches.length, currentIdx, scrollToMatch]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentIdx - 1 + matches.length) % matches.length;
    setCurrentIdx(prev);
    scrollToMatch(prev);
  }, [matches.length, currentIdx, scrollToMatch]);

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
    setMatches([]);
    setCurrentIdx(-1);
    clearHighlights();
  }, [clearHighlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+F → open search
      if (mod && e.key === "f") {
        e.preventDefault();
        setVisible(true);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      if (!visible) return;

      // Escape → close
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      // Cmd/Ctrl+G → next, Shift+Cmd/Ctrl+G → prev
      if (mod && e.key === "g") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, close, goNext, goPrev]);

  if (!visible) return null;

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="搜索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches.length > 0 && !e.shiftKey) {
              goNext();
            } else if (matches.length > 0 && e.shiftKey) {
              goPrev();
            } else {
              doSearch(query);
            }
          }
        }}
      />
      <span className="search-count">
        {query ? `${matches.length > 0 ? currentIdx + 1 : 0} / ${matches.length}` : ""}
      </span>
      <button className="search-nav-btn" onClick={goPrev} title="上一个 (Shift+⌘G)" disabled={matches.length === 0}>▲</button>
      <button className="search-nav-btn" onClick={goNext} title="下一个 (⌘G)" disabled={matches.length === 0}>▼</button>
      <button className="search-close-btn" onClick={close} title="关闭 (Esc)">✕</button>
    </div>
  );
}
