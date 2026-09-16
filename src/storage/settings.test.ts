import { describe, it, expect, beforeEach } from "vitest"
import { loadSettings, saveSettings, defaultSettings } from "./settings"

beforeEach(() => {
  localStorage.clear()
})

describe("settings storage", () => {
  it("returns sensible defaults", () => {
    expect(loadSettings()).toEqual({ deepseekApiKey: "", deepseekModel: "deepseek-chat" })
  })

  it("persists and reloads settings", () => {
    saveSettings({ deepseekApiKey: "sk-123", deepseekModel: "deepseek-reasoner" })
    expect(loadSettings()).toEqual({ deepseekApiKey: "sk-123", deepseekModel: "deepseek-reasoner" })
  })

  it("recovers from invalid JSON", () => {
    localStorage.setItem("promptbox.settings.v1", "{not json")
    expect(loadSettings()).toEqual(defaultSettings())
  })

  it("fills in a missing model", () => {
    localStorage.setItem("promptbox.settings.v1", JSON.stringify({ deepseekApiKey: "x" }))
    const s = loadSettings()
    expect(s.deepseekApiKey).toBe("x")
    expect(s.deepseekModel).toBe("deepseek-chat")
  })

  it("ignores non-string values", () => {
    localStorage.setItem("promptbox.settings.v1", JSON.stringify({ deepseekApiKey: 5, deepseekModel: 7 }))
    expect(loadSettings()).toEqual(defaultSettings())
  })
})
