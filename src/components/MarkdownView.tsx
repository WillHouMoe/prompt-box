import { useMemo } from "react"
import { renderMarkdown } from "@/lib/markdown"

export function MarkdownView({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content])
  return (
    <div
      className="markdown"
      // Safe: output is sanitized by DOMPurify before render.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
