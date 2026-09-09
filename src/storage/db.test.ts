import { describe, it, expect, beforeEach } from "vitest"
import {
  loadRawState,
  getPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  duplicatePrompt,
  toggleFavorite,
  markUsed,
  addCategory,
  importBackup,
} from "./db"
import type { PromptInput } from "@/types"

const input: PromptInput = {
  title: "测试 Prompt",
  content: "你好 {{name}}",
  category_id: "study",
  tags: ["测试"],
  favorite: false,
}

beforeEach(() => {
  localStorage.clear()
})

describe("storage CRUD", () => {
  it("initializes with seed prompts on first run", () => {
    const state = loadRawState()
    expect(state.prompts.length).toBeGreaterThan(0)
    expect(state.categories.length).toBeGreaterThan(0)
  })

  it("creates a prompt with timestamps", () => {
    const p = createPrompt(input)
    expect(p.id).toBeTruthy()
    expect(p.title).toBe("测试 Prompt")
    expect(p.created_at).toBeGreaterThan(0)
    expect(p.updated_at).toBeGreaterThan(0)
    expect(getPrompt(p.id)?.title).toBe("测试 Prompt")
  })

  it("updates a prompt and bumps updated_at", () => {
    const p = createPrompt(input)
    const updated = updatePrompt(p.id, { title: "改名", tags: ["新"] })
    expect(updated?.title).toBe("改名")
    expect(updated?.tags).toEqual(["新"])
    expect(updated?.updated_at).toBeGreaterThanOrEqual(p.updated_at)
  })

  it("returns null when updating a missing prompt", () => {
    expect(updatePrompt("nope", { title: "x" })).toBeNull()
  })

  it("deletes a prompt", () => {
    const p = createPrompt(input)
    expect(deletePrompt(p.id)).toBe(true)
    expect(getPrompt(p.id)).toBeNull()
    expect(deletePrompt(p.id)).toBe(false)
  })

  it("duplicates a prompt with 'Copy' suffix and new id", () => {
    const p = createPrompt(input)
    const copy = duplicatePrompt(p.id)
    expect(copy).not.toBeNull()
    expect(copy!.id).not.toBe(p.id)
    expect(copy!.title).toBe("测试 Prompt Copy")
    expect(copy!.favorite).toBe(false)
    expect(getPrompts()).toHaveLength(loadRawState().prompts.length)
  })

  it("toggles favorite", () => {
    const p = createPrompt(input)
    const fav = toggleFavorite(p.id)
    expect(fav?.favorite).toBe(true)
    const unfav = toggleFavorite(p.id)
    expect(unfav?.favorite).toBe(false)
  })

  it("marks used and sets last_used_at", () => {
    const p = createPrompt(input)
    const used = markUsed(p.id)
    expect(used?.last_used_at).toBeTruthy()
  })

  it("adds a category", () => {
    const c = addCategory("新分类")
    expect(c.name).toBe("新分类")
    expect(loadRawState().categories.some((x) => x.id === c.id)).toBe(true)
  })
})

describe("persistence", () => {
  it("persists prompts across saveState/loadRawState", () => {
    const state = loadRawState()
    const p = createPrompt(input)
    // Simulate a fresh read from localStorage.
    const reloaded = loadRawState()
    expect(reloaded.prompts.some((x) => x.id === p.id)).toBe(true)
    expect(reloaded.prompts).toHaveLength(state.prompts.length + 1)
  })

  it("survives a full clear + re-seed by using stored data when present", () => {
    const p = createPrompt(input)
    localStorage.setItem("promptbox.data.v1", JSON.stringify({ prompts: [p], categories: [] }))
    const reloaded = loadRawState()
    expect(reloaded.prompts).toHaveLength(1)
    expect(reloaded.prompts[0].title).toBe("测试 Prompt")
  })
})

describe("importBackup", () => {
  it("imports new prompts without duplicating existing ids", () => {
    const existing = createPrompt(input)
    importBackup({
      version: 1,
      exported_at: "",
      prompts: [existing, { ...existing, id: "new-id", title: "导入的" }],
      categories: [{ id: "study", name: "学习" }],
    })
    const prompts = getPrompts()
    expect(prompts.some((p) => p.id === "new-id")).toBe(true)
    expect(prompts.filter((p) => p.id === existing.id)).toHaveLength(1)
  })
})
