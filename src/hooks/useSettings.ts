import { useCallback, useState } from "react"
import type { AppSettings } from "@/types"
import { loadSettings, saveSettings } from "@/storage/settings"

/** Persisted app settings (DeepSeek API key/model) backed by localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, updateSettings }
}
