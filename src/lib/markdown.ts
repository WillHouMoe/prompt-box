import { marked } from "marked"
import DOMPurify from "dompurify"

marked.setOptions({
  gfm: true,
  breaks: true,
})

/**
 * Render basic Markdown to sanitized HTML. Safe for user-generated content.
 */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md ?? "", { async: false }) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "code", "pre", "blockquote",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a",
      "span", "hr", "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "align"],
  })
}
