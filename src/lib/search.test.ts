import { describe, it, expect } from "vitest"
import { filterPrompts, sortByRecent } from "./search"
import type { Prompt } from "@/types"

function makePrompt(partial: Partial<Prompt>): Prompt {
  return {
    id: Math.random().toString(36).slice(2),
    title: "",
    content: "",
    tags: [],
    favorite: false,
    created_at: 1,
    updated_at: 1,
    ...partial,
  }
}

const categories = [
  { id: "writing", name: "写作" },
  { id: "code", name: "编程" },
]

describe("filterPrompts", () => {
  const prompts = [
    makePrompt({ id: "1", title: "英语作文润色", content: "请帮我修改作文 {{essay}}", category_id: "writing", tags: ["英语", "高考"] }),
    makePrompt({ id: "2", title: "Code Review", content: "审查 {{code}}", category_id: "code", tags: ["代码"] }),
    makePrompt({ id: "3", title: "会议纪要", content: "整理会议内容", tags: ["工作"] }),
  ]

  it("returns all prompts for empty query", () => {
    expect(filterPrompts(prompts, "", categories)).toHaveLength(3)
  })

  it("searches title", () => {
    expect(filterPrompts(prompts, "润色", categories).map((p) => p.id)).toEqual(["1"])
  })

  it("searches content", () => {
    expect(filterPrompts(prompts, "审查", categories).map((p) => p.id)).toEqual(["2"])
  })

  it("searches category name", () => {
    expect(filterPrompts(prompts, "写作", categories).map((p) => p.id)).toEqual(["1"])
  })

  it("searches tags", () => {
    expect(filterPrompts(prompts, "高考", categories).map((p) => p.id)).toEqual(["1"])
    expect(filterPrompts(prompts, "工作", categories).map((p) => p.id)).toEqual(["3"])
  })

  it("is case-insensitive for latin text", () => {
    expect(filterPrompts(prompts, "code review", categories).map((p) => p.id)).toEqual(["2"])
    expect(filterPrompts(prompts, "CODE", categories).map((p) => p.id)).toEqual(["2"])
  })

  it("returns [] when nothing matches", () => {
    expect(filterPrompts(prompts, "不存在的词", categories)).toEqual([])
  })
})

describe("sortByRecent", () => {
  it("sorts by last_used_at descending, falling back to updated_at", () => {
    const prompts = [
      makePrompt({ id: "a", last_used_at: 100, updated_at: 1000 }),
      makePrompt({ id: "b", last_used_at: 300 }),
      makePrompt({ id: "c", updated_at: 5000 }),
      makePrompt({ id: "d", updated_at: 200 }),
    ]
    expect(sortByRecent(prompts).map((p) => p.id)).toEqual(["c", "b", "d", "a"])
  })
})
