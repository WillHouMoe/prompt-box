import { useCallback, useState } from "react"

/**
 * Copy text to the clipboard with a temporary "copied" state.
 * Includes a fallback for non-secure contexts.
 */
export function useClipboard(timeout = 1600) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement("textarea")
          ta.value = text
          ta.style.position = "fixed"
          ta.style.opacity = "0"
          document.body.appendChild(ta)
          ta.select()
          document.execCommand("copy")
          document.body.removeChild(ta)
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), timeout)
        return true
      } catch {
        return false
      }
    },
    [timeout],
  )

  return { copied, copy }
}
