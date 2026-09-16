import type { AppSettings } from "@/types"
import {
  DEEPSEEK_DEFAULT_BASE_URL,
  DEEPSEEK_MODELS,
  DEFAULT_DEEPSEEK_MODEL,
} from "@/lib/deepseek"

const SETTINGS_KEY = "promptbox.settings.v2"

export function defaultSettings(): AppSettings {
  return {
    deepseekApiKey: "",
    deepseekModel: DEFAULT_DEEPSEEK_MODEL,
    deepseekBaseUrl: DEEPSEEK_DEFAULT_BASE_URL,
    // DeepSeek 的思考模式默认开启，草稿质量更好；用户可在设置里关掉换取速度。
    deepseekThinking: true,
  }
}

function normalizeModel(value: unknown): string {
  // Old builds used deepseek-chat / deepseek-reasoner, which are retired.
  if (typeof value === "string" && (DEEPSEEK_MODELS as readonly string[]).includes(value)) {
    return value
  }
  return DEFAULT_DEEPSEEK_MODEL
}

function normalizeBaseUrl(value: unknown): string {
  if (typeof value === "string" && /^https?:\/\//.test(value.trim())) {
    return value.trim().replace(/\/+$/, "")
  }
  return DEEPSEEK_DEFAULT_BASE_URL
}

export function loadSettings(): AppSettings {
  if (typeof localStorage === "undefined") return defaultSettings()
  // Read v2, falling back to the v1 key so existing keys are not lost.
  const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem("promptbox.settings.v1")
  if (!raw) return defaultSettings()
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      deepseekApiKey: typeof parsed.deepseekApiKey === "string" ? parsed.deepseekApiKey : "",
      deepseekModel: normalizeModel(parsed.deepseekModel),
      deepseekBaseUrl: normalizeBaseUrl(parsed.deepseekBaseUrl),
      deepseekThinking: parsed.deepseekThinking !== false,
    }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
