import { describe, it, expect } from "vitest"
import { effectiveTarget, isTarget, targetSearchText, TARGET_LABEL } from "./targets"

describe("effectiveTarget", () => {
  it("defaults to chat when unspecified", () => {
    expect(effectiveTarget({})).toBe("chat")
    expect(effectiveTarget({ target: undefined })).toBe("chat")
  })

  it("keeps an explicit target", () => {
    expect(effectiveTarget({ target: "agent" })).toBe("agent")
    expect(effectiveTarget({ target: "chat" })).toBe("chat")
  })
})

describe("isTarget", () => {
  it("accepts only chat | agent", () => {
    expect(isTarget("chat")).toBe(true)
    expect(isTarget("agent")).toBe(true)
    expect(isTarget("other")).toBe(false)
    expect(isTarget(undefined)).toBe(false)
    expect(isTarget(1)).toBe(false)
    expect(isTarget(null)).toBe(false)
  })
})

describe("labels and search text", () => {
  it("has human labels", () => {
    expect(TARGET_LABEL.chat).toBe("Chat")
    expect(TARGET_LABEL.agent).toBe("Agent")
  })

  it("exposes searchable keywords", () => {
    expect(targetSearchText("chat")).toContain("chat")
    expect(targetSearchText("agent")).toContain("agent")
    expect(targetSearchText("agent")).toContain("本地")
  })
})
