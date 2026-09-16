import { useCallback, useState } from "react"

/** Copy through a hidden textarea + execCommand; the last-resort path. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.top = "0"
    ta.style.left = "0"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Copy text to the clipboard with a temporary "copied" state.
 *
 * Some browsers (and embedded webviews) reject the async clipboard API even on
 * https, so a rejection falls back to the old textarea + execCommand path
 * instead of showing "复制失败" to the user.
 */
export function useClipboard(timeout = 1600) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      let ok = false
      const asyncClipboard = window.navigator?.clipboard
      if (asyncClipboard && window.isSecureContext) {
        try {
          await asyncClipboard.writeText(text)
          ok = true
        } catch {
          ok = legacyCopy(text)
        }
      } else {
        ok = legacyCopy(text)
      }
      if (!ok) return false
      setCopied(true)
      window.setTimeout(() => setCopied(false), timeout)
      return true
    },
    [timeout],
  )

  return { copied, copy }
}
