import { describe, it, expect } from "vitest"
import { extractVariables, renderPrompt } from "./variables"

describe("extractVariables", () => {
  it("returns [] for content without variables", () => {
    expect(extractVariables("请帮我改一下作文")).toEqual([])
  })

  it("returns [] for empty content", () => {
    expect(extractVariables("")).toEqual([])
  })

  it("extracts a single variable", () => {
    expect(extractVariables("请分析 {{code}}")).toEqual(["code"])
  })

  it("extracts multiple variables in order of first appearance", () => {
    expect(extractVariables("{{name}} 喜欢 {{language}}")).toEqual(["name", "language"])
  })

  it("deduplicates repeated variables, keeping first position", () => {
    expect(extractVariables("{{name}} 你好，{{name}}。{{name}}!")).toEqual(["name"])
  })

  it("handles whitespace inside placeholders", () => {
    expect(extractVariables("{{ name }} and {{language}}")).toEqual(["name", "language"])
  })

  it("ignores free-form text and partial braces", () => {
    expect(extractVariables("使用 { 和 } }} 只保留 {{real}}")).toEqual(["real"])
  })

  it("supports long content and many variables", () => {
    const long = Array.from({ length: 50 }, (_, i) => `{{var${i}}}`).join(" ")
    const vars = extractVariables(long)
    expect(vars).toHaveLength(50)
    expect(vars[0]).toBe("var0")
  })
})

describe("renderPrompt", () => {
  it("returns content unchanged when there are no variables", () => {
    expect(renderPrompt("你好，世界", {})).toBe("你好，世界")
  })

  it("returns empty string for empty content", () => {
    expect(renderPrompt("", {})).toBe("")
  })

  it("replaces a single variable", () => {
    expect(renderPrompt("你好 {{name}}", { name: "小明" })).toBe("你好 小明")
  })

  it("replaces multiple variables", () => {
    const out = renderPrompt("{{a}} 和 {{b}}", { a: "甲", b: "乙" })
    expect(out).toBe("甲 和 乙")
  })

  it("replaces repeated variable occurrences at every position", () => {
    const out = renderPrompt("{{name}} 说，{{name}} 很高兴。", { name: "Alice" })
    expect(out).toBe("Alice 说，Alice 很高兴。")
  })

  it("replaces unfilled variables with empty string", () => {
    expect(renderPrompt("a{{missing}}b", {})).toBe("ab")
  })

  it("treats empty value as empty string", () => {
    expect(renderPrompt("{{x}}", { x: "" })).toBe("")
  })

  it("preserves surrounding text and newlines", () => {
    const out = renderPrompt("第一行\n{{x}}\n第三行", { x: "第二行" })
    expect(out).toBe("第一行\n第二行\n第三行")
  })
})
