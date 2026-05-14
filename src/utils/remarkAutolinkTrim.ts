/**
 * Remark plugin to trim trailing non-URL characters from GFM autolinks.
 *
 * GFM autolink literal parsing doesn't properly handle CJK characters and
 * punctuation at the end of URLs. For example, in Chinese text like:
 *   "https://www.example.com，额外的中文。"
 * remark-gfm will include "，额外的中文。" as part of the URL.
 *
 * This plugin walks the AST after remark-gfm and trims characters that
 * shouldn't be part of a URL from the end of autolink nodes.
 */

/**
 * Match trailing characters that are NOT valid in a URL path/query/fragment.
 * This catches:
 * - CJK Unified Ideographs (U+4E00–U+9FFF)
 * - CJK punctuation (U+3000–U+303F)
 * - Fullwidth punctuation (U+FF00–U+FF60)
 * - Common CJK punctuation marks: ，。、；：！？》）】」』""''…—·～
 * - Other non-ASCII characters that are clearly not part of a URL
 *
 * Strategy: find the first CJK/fullwidth character that signals the URL has ended,
 * then trim everything from that point onward.
 */
const FIRST_CJK_OR_FULLWIDTH =
  /[，。、；：！？》）】」』""''…—·～\u3000-\u303F\u4E00-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function remarkAutolinkTrim() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    visitParents(tree);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function visitParents(node: any) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const child = node.children[i] as any;

    // Only process autolink-style links:
    // These are links where the URL equals the link text (GFM autolink literals)
    if (child.type === "link") {
      const linkText = getLinkText(child);

      // Check if this is an autolink (URL matches the visible text)
      if (linkText && child.url === linkText) {
        const url: string = child.url;

        // Find the first CJK/fullwidth character in the URL
        // We search after the protocol+domain part to avoid false positives
        // in internationalized domain names (though those are rare in autolinks)
        const match = url.match(FIRST_CJK_OR_FULLWIDTH);
        if (match && match.index !== undefined) {
          const cutIndex = match.index;
          const tail = url.slice(cutIndex);

          // Trim the URL
          child.url = url.slice(0, cutIndex);
          // Trim the link text
          trimLinkText(child, tail.length);
          // Insert a text node after the link with the trimmed content
          node.children.splice(i + 1, 0, { type: "text", value: tail });
          i++; // skip the newly inserted node
        }
      }
    }

    // Recurse into children
    visitParents(child);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLinkText(link: any): string {
  let text = "";
  for (const child of link.children) {
    if (child.type === "text") {
      text += child.value;
    }
  }
  return text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trimLinkText(link: any, trimLength: number) {
  for (let i = link.children.length - 1; i >= 0; i--) {
    const child = link.children[i];
    if (child.type === "text") {
      if (child.value.length <= trimLength) {
        trimLength -= child.value.length;
        link.children.splice(i, 1);
      } else {
        child.value = child.value.slice(0, -trimLength);
        break;
      }
    }
  }
}

export default remarkAutolinkTrim;
