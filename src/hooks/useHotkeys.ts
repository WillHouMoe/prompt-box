import { useEffect } from "react"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable
}

interface HotkeyOptions {
  onCommandK?: () => void
  onNew?: () => void
}

/**
 * Register global keyboard shortcuts: Cmd/Ctrl+K for search, N for new.
 * Letter shortcuts are skipped while typing in inputs/textareas.
 */
export function useHotkeys({ onCommandK, onNew }: HotkeyOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onCommandK?.()
        return
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === "n" && !isEditableTarget(e.target)) {
          e.preventDefault()
          onNew?.()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onCommandK, onNew])
}
