import { describe, it, expect } from "vitest"
import { estimatePromptHeight, splitIntoColumns } from "./masonry"
import type { Prompt } from "@/types"

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "p1",
    title: "标题",
    content: "内容",
    tags: [],
    favorite: false,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  }
}

const byValue = (n: number) => n

describe("splitIntoColumns", () => {
  it("returns a single column unchanged when only one is requested", () => {
    expect(splitIntoColumns([1, 2, 3], 1, byValue)).toEqual([[1, 2, 3]])
  })

  it("keeps every item exactly once", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1)
    const columns = splitIntoColumns(items, 2, byValue)
    expect(columns.flat().sort((a, b) => a - b)).toEqual(items)
  })

  it("appends each item to the shortest column", () => {
    // 100 goes left; every small item then keeps going right until it catches up.
    const columns = splitIntoColumns([100, 10, 10, 10], 2, byValue)
    expect(columns[0]).toEqual([100])
    expect(columns[1]).toEqual([10, 10, 10])
  })

  it("alternates when items have equal height", () => {
    const columns = splitIntoColumns([1, 2, 3, 4], 2, () => 10)
    expect(columns[0]).toEqual([1, 3])
    expect(columns[1]).toEqual([2, 4])
  })

  it("supports three columns", () => {
    const columns = splitIntoColumns([1, 2, 3], 3, () => 5)
    expect(columns.map((c) => c.length)).toEqual([1, 1, 1])
  })

  it("treats a bogus column count as one", () => {
    expect(splitIntoColumns([1], 0, byValue)).toEqual([[1]])
    expect(splitIntoColumns([1], -3, byValue)).toEqual([[1]])
  })
})

describe("estimatePromptHeight", () => {
  it("grows with longer content", () => {
    const short = estimatePromptHeight(makePrompt({ content: "短" }))
    const long = estimatePromptHeight(
      makePrompt({ content: "很长的内容。".repeat(20) }),
    )
    expect(long).toBeGreaterThan(short)
  })

  it("adds room for the variable row", () => {
    const noVar = estimatePromptHeight(makePrompt({ content: "请修改作文" }))
    const withVar = estimatePromptHeight(makePrompt({ content: "请修改 {{essay}}" }))
    expect(withVar - noVar).toBe(28)
  })

  it("matches the real card height for a one line card", () => {
    // Calibrated against the browser: 1 line + variable row + 2 pills = 204px.
    expect(estimatePromptHeight(makePrompt({ content: "翻译成英文：{{text}}" }))).toBe(204)
  })

  it("adds a row when the meta line wraps", () => {
    const few = estimatePromptHeight(makePrompt({ content: "内容", tags: ["a"] }))
    const many = estimatePromptHeight(
      makePrompt({ content: "内容", tags: ["a", "b", "c", "d", "e", "f"] }),
    )
    expect(many).toBeGreaterThan(few)
  })

  it("never returns a height below the fixed chrome", () => {
    expect(estimatePromptHeight(makePrompt({ content: "" }))).toBe(176)
  })
})
