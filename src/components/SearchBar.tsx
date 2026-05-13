import { useCallback, useEffect, useRef, useState } from "react";

interface SearchBarProps {
  /** The scrollable container to search within */
  containerSelector: string;
  /** The content root to search text in */
  contentSelector: string;
  /** Current file path – when it changes the search bar auto-closes */
  filePath?: string;
}

/** Find all text match ranges inside a container element.
 *  Concatenates all text nodes so that matches spanning across adjacent
 *  text nodes (e.g. "生产：") are found correctly.
 */
function findMatches(root: Element, query: string): Range[] {
  if (!query) return [];

  const lower = query.toLowerCase();

  // Collect all text nodes with their positions in the concatenated string
  const textNodes: { node: Text; start: number; end: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let totalLen = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.textContent?.length ?? 0;
    textNodes.push({ node, start: totalLen, end: totalLen + len });
    totalLen += len;
  }

  // Build the full concatenated text (lowercase for case-insensitive search)
  const fullText = textNodes.map((t) => t.node.textContent?.toLowerCase() ?? "").join("");

  // Find all match positions in the concatenated string
  const matchPositions: { start: number; end: number }[] = [];
  let searchStart = 0;
  while (true) {
    const idx = fullText.indexOf(lower, searchStart);
    if (idx === -1) break;
    matchPositions.push({ start: idx, end: idx + lower.length });
    searchStart = idx + 1;
  }

  if (matchPositions.length === 0) return [];

  // Map each match position back to DOM Ranges
  const ranges: Range[] = [];
  for (const pos of matchPositions) {
    const range = document.createRange();
    let rangeStartSet = false;

    for (const tn of textNodes) {
      if (!rangeStartSet && tn.end > pos.start) {
        range.setStart(tn.node, pos.start - tn.start);
        rangeStartSet = true;
      }
      if (rangeStartSet && tn.end >= pos.end) {
        range.setEnd(tn.node, pos.end - tn.start);
        break;
      }
    }

    if (rangeStartSet) {
      ranges.push(range);
    }
  }

  return ranges;
}

// Names for CSS Custom Highlight API registrations
const HIGHLIGHT_NAME = "search-results";
const HIGHLIGHT_ACTIVE_NAME = "search-result-active";

// Check if CSS Custom Highlight API is available
const hasHighlightAPI = typeof CSS !== "undefined" && "highlights" in CSS;

export default function SearchBar({ containerSelector, contentSelector, filePath }: SearchBarProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [searchedQuery, setSearchedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Store ranges for navigation (scrolling to match)
  const rangesRef = useRef<Range[]>([]);

  // Clear all highlights via CSS Custom Highlight API
  const clearHighlights = useCallback(() => {
    if (hasHighlightAPI) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
      CSS.highlights.delete(HIGHLIGHT_ACTIVE_NAME);
    }
    rangesRef.current = [];
  }, []);

  // Apply highlights using CSS Custom Highlight API (no DOM mutation!)
  const applyHighlights = useCallback((ranges: Range[], activeIdx: number) => {
    if (!hasHighlightAPI) return;

    // Create highlight for all matches (excluding active)
    const inactiveRanges = ranges.filter((_, i) => i !== activeIdx);
    const activeRange = activeIdx >= 0 && activeIdx < ranges.length ? [ranges[activeIdx]] : [];

    if (inactiveRanges.length > 0) {
      const highlight = new Highlight(...inactiveRanges);
      CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    } else {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    }

    if (activeRange.length > 0) {
      const activeHighlight = new Highlight(...activeRange);
      CSS.highlights.set(HIGHLIGHT_ACTIVE_NAME, activeHighlight);
    } else {
      CSS.highlights.delete(HIGHLIGHT_ACTIVE_NAME);
    }
  }, []);

  // Scroll to the active match range
  const scrollToMatch = useCallback((idx: number, ranges: Range[]) => {
    const range = ranges[idx];
    if (!range) return;

    // Update highlight to reflect new active
    applyHighlights(ranges, idx);

    const container = document.querySelector(containerSelector);
    if (container) {
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = rect.top - containerRect.top - containerRect.height / 3;
      container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
    }
  }, [containerSelector, applyHighlights]);

  // Execute search
  const doSearch = useCallback((searchQuery: string) => {
    const content = document.querySelector(contentSelector);
    if (!content || !searchQuery) {
      setMatchCount(0);
      setCurrentIdx(-1);
      setSearchedQuery("");
      clearHighlights();
      return;
    }

    clearHighlights();
    setSearchedQuery(searchQuery);

    const found = findMatches(content, searchQuery);
    rangesRef.current = found;
    setMatchCount(found.length);

    if (found.length > 0) {
      setCurrentIdx(0);
      applyHighlights(found, 0);
      requestAnimationFrame(() => {
        const range = found[0];
        if (range) {
          const container = document.querySelector(containerSelector);
          if (container) {
            const rect = range.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offset = rect.top - containerRect.top - containerRect.height / 3;
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
      setMatchCount(0);
      setCurrentIdx(-1);
    }
  }, [visible, clearHighlights]);

  // Close search bar when switching documents
  useEffect(() => {
    if (visible) {
      setVisible(false);
      setQuery("");
      setMatchCount(0);
      setCurrentIdx(-1);
      clearHighlights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  const goNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = (currentIdx + 1) % matchCount;
    setCurrentIdx(next);
    scrollToMatch(next, rangesRef.current);
  }, [matchCount, currentIdx, scrollToMatch]);

  const goPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = (currentIdx - 1 + matchCount) % matchCount;
    setCurrentIdx(prev);
    scrollToMatch(prev, rangesRef.current);
  }, [matchCount, currentIdx, scrollToMatch]);

  const close = useCallback(() => {
    const container = document.querySelector(containerSelector);
    const scrollTop = container?.scrollTop ?? 0;
    inputRef.current?.blur();
    setVisible(false);
    setQuery("");
    setSearchedQuery("");
    setMatchCount(0);
    setCurrentIdx(-1);
    clearHighlights();
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = scrollTop;
      }
    });
  }, [clearHighlights, containerSelector]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+F → open search (with optional selected text)
      if (mod && e.key === "f") {
        e.preventDefault();
        const selectedText = window.getSelection()?.toString().trim() ?? "";
        setVisible(true);
        if (selectedText) {
          setQuery(selectedText);
          requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
            doSearch(selectedText);
          });
        } else {
          requestAnimationFrame(() => inputRef.current?.focus());
        }
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
  }, [visible, close, goNext, goPrev, doSearch]);

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
            if (query === searchedQuery && matchCount > 0 && !e.shiftKey) {
              goNext();
            } else if (query === searchedQuery && matchCount > 0 && e.shiftKey) {
              goPrev();
            } else {
              doSearch(query);
            }
          }
        }}
      />
      <span className="search-count">
        {query ? `${matchCount > 0 ? currentIdx + 1 : 0} / ${matchCount}` : ""}
      </span>
      <button className="search-nav-btn" onClick={goPrev} title="上一个 (Shift+⌘G)" disabled={matchCount === 0}>▲</button>
      <button className="search-nav-btn" onClick={goNext} title="下一个 (⌘G)" disabled={matchCount === 0}>▼</button>
      <button className="search-close-btn" onClick={close} title="关闭 (Esc)">✕</button>
    </div>
  );
}
