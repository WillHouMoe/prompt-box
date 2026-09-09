import { describe, it, expect } from "vitest"
import { exportBackup, parseBackup, sanitizePrompt } from "./importExport"
import type { Category, Prompt } from "@/types"

const prompt: Prompt = {
  id: "p1",
  title: "英语作文润色",
  content: "请修改：\n{{essay}}",
  category_id: "writing",
  tags: ["英语", "写作"],
  favorite: true,
  created_at: 100,
  updated_at: 200,
  last_used_at: 300,
}

const categories: Category[] = [
  { id: "writing", name: "写作", builtin: true },
  { id: "code", name: "编程" },
]

describe("exportBackup / makeBackup", () => {
  it("serializes to a valid JSON string with version and data", () => {
    const json = exportBackup([prompt], categories)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.prompts).toHaveLength(1)
    expect(parsed.categories).toHaveLength(2)
  })

  it("exports and imports cleanly (roundtrip)", () => {
    const json = exportBackup([prompt], categories)
    const res = parseBackup(json)
    expect(res.errors).toEqual([])
    expect(res.prompts).toEqual([prompt])
    expect(res.categories).toHaveLength(2)
  })
})

describe("parseBackup", () => {
  it("throws a friendly error on invalid JSON", () => {
    expect(() => parseBackup("{ not json")).toThrow(/JSON/i)
  })

  it("throws on unrecognized structure", () => {
    expect(() => parseBackup('{"foo":1}')).toThrow(/无法识别/)
  })

  it("accepts a bare array of prompts", () => {
    const res = parseBackup(JSON.stringify([prompt]))
    expect(res.prompts).toHaveLength(1)
    expect(res.categories).toEqual([])
  })

  it("skips malformed prompts and reports errors", () => {
    const bad = { id: 123, title: "无 id" }
    const res = parseBackup(JSON.stringify({ prompts: [prompt, bad, null, 42], categories }))
    expect(res.prompts).toHaveLength(1)
    expect(res.errors.length).toBeGreaterThanOrEqual(3)
  })

  it("filters invalid categories", () => {
    const cat = [{ id: "ok", name: "好" }, { id: "bad", name: 5 }]
    const res = parseBackup(JSON.stringify({ prompts: [], categories: cat }))
    expect(res.categories).toHaveLength(1)
  })
})

describe("sanitizePrompt", () => {
  it("normalizes tags and title", () => {
    const clean = sanitizePrompt({
      ...prompt,
      title: "  标题  ",
      tags: [" a ", " ", "b"],
    })
    expect(clean?.title).toBe("标题")
    expect(clean?.tags).toEqual(["a", "b"])
  })

  it("returns null for non-prompt objects", () => {
    expect(sanitizePrompt({ title: "只有标题" })).toBeNull()
    expect(sanitizePrompt(null)).toBeNull()
    expect(sanitizePrompt("str")).toBeNull()
  })
})
