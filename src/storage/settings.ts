import type { AppSettings } from "@/types"
import { DEFAULT_DEEPSEEK_MODEL } from "@/lib/deepseek"

const SETTINGS_KEY = "promptbox.settings.v1"

export function defaultSettings(): AppSettings {
  return { deepseekApiKey: "", deepseekModel: DEFAULT_DEEPSEEK_MODEL }
}

export function loadSettings(): AppSettings {
  if (typeof localStorage === "undefined") return defaultSettings()
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return defaultSettings()
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      deepseekApiKey:
        typeof parsed.deepseekApiKey === "string" ? parsed.deepseekApiKey : "",
      deepseekModel:
        typeof parsed.deepseekModel === "string" && parsed.deepseekModel
          ? parsed.deepseekModel
          : DEFAULT_DEEPSEEK_MODEL,
    }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
