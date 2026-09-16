import { describe, it, expect, beforeEach } from "vitest"
import { loadSettings, saveSettings, defaultSettings } from "./settings"

beforeEach(() => {
  localStorage.clear()
})

const DEFAULTS = {
  deepseekApiKey: "",
  deepseekModel: "deepseek-flash",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekThinking: true,
}

describe("settings storage", () => {
  it("returns sensible defaults", () => {
    expect(defaultSettings()).toEqual(DEFAULTS)
    expect(loadSettings()).toEqual(DEFAULTS)
  })

  it("persists and reloads settings", () => {
    const next = {
      deepseekApiKey: "sk-123",
      deepseekModel: "deepseek-v4-pro",
      deepseekBaseUrl: "https://proxy.example.com/v1",
      deepseekThinking: false,
    }
    saveSettings(next)
    expect(loadSettings()).toEqual(next)
  })

  it("writes to the v2 key", () => {
    saveSettings(DEFAULTS)
    expect(localStorage.getItem("promptbox.settings.v2")).toBeTruthy()
  })

  it("migrates the legacy v1 key without losing the api key", () => {
    localStorage.setItem("promptbox.settings.v1", JSON.stringify({ deepseekApiKey: "sk-old" }))
    const s = loadSettings()
    expect(s.deepseekApiKey).toBe("sk-old")
    expect(s.deepseekModel).toBe("deepseek-flash")
  })

  it("recovers from invalid JSON", () => {
    localStorage.setItem("promptbox.settings.v2", "{not json")
    expect(loadSettings()).toEqual(DEFAULTS)
  })

  it("replaces retired model names with the current default", () => {
    localStorage.setItem(
      "promptbox.settings.v2",
      JSON.stringify({ deepseekApiKey: "x", deepseekModel: "deepseek-chat" }),
    )
    expect(loadSettings().deepseekModel).toBe("deepseek-flash")

    localStorage.setItem(
      "promptbox.settings.v2",
      JSON.stringify({ deepseekApiKey: "x", deepseekModel: "deepseek-reasoner" }),
    )
    expect(loadSettings().deepseekModel).toBe("deepseek-flash")
  })

  it("ignores non-string values", () => {
    localStorage.setItem(
      "promptbox.settings.v2",
      JSON.stringify({ deepseekApiKey: 5, deepseekModel: 7, deepseekBaseUrl: 9 }),
    )
    expect(loadSettings()).toEqual(DEFAULTS)
  })

  it("normalises the base url", () => {
    localStorage.setItem(
      "promptbox.settings.v2",
      JSON.stringify({ deepseekBaseUrl: "https://proxy.example.com/v1///" }),
    )
    expect(loadSettings().deepseekBaseUrl).toBe("https://proxy.example.com/v1")

    localStorage.setItem("promptbox.settings.v2", JSON.stringify({ deepseekBaseUrl: "not-a-url" }))
    expect(loadSettings().deepseekBaseUrl).toBe("https://api.deepseek.com")
  })

  it("keeps thinking on unless explicitly disabled", () => {
    localStorage.setItem("promptbox.settings.v2", JSON.stringify({ deepseekThinking: false }))
    expect(loadSettings().deepseekThinking).toBe(false)
    localStorage.setItem("promptbox.settings.v2", JSON.stringify({ deepseekApiKey: "x" }))
    expect(loadSettings().deepseekThinking).toBe(true)
  })
})
