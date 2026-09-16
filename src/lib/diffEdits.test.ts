import { describe, it, expect } from "vitest"
import { locateEdit, locateFind, mergeEdits, parseEdits } from "./diffEdits"

describe("locateEdit", () => {
  it("finds a unique snippet", () => {
    expect(locateEdit("第一段\n第二段\n第三段", "第二段")).toBe("ok")
  })

  it("reports a missing snippet", () => {
    expect(locateEdit("第一段\n第二段", "第三段")).toBe("not-found")
    expect(locateEdit("第一段", "")).toBe("not-found")
  })

  it("reports an ambiguous snippet", () => {
    expect(locateEdit("要求：1. 保留原意\n要求：1. 保留原意", "要求：1. 保留原意")).toBe("ambiguous")
  })

  it("tolerates whitespace differences", () => {
    expect(locateEdit("第一段\n\n\n第二段", "第一段\n第二段")).toBe("ok")
    expect(locateEdit("  缩进两格\n下一行", "缩进两格\n下一行")).toBe("ok")
  })
})

describe("locateFind: AI 抄写漂移时的模糊定位", () => {
  const DOC = `## 四、例句与语料规则

如果原文中有体现该义项的句子：

**必须保留原文例句。**

同时补充：

* 常见现代汉语词语；
* 成语；

判定标准（必须同时满足，缺一不可）：
`

  it("标点被改写也能定位（，→：）", () => {
    const found = locateFind(DOC, "如果原文中有体现该义项的句子，必须保留原文例句。")
    expect(found.status).toBe("ok")
    expect(found.match).toBe("fuzzy")
  })

  it("列表符号被改写也能定位（* → -）", () => {
    const found = locateFind(DOC, "- 常见现代汉语词语；")
    expect(found.status).toBe("ok")
  })

  it("全角/半角标点差异也能定位", () => {
    const found = locateFind(DOC, "判定标准(必须同时满足,缺一不可):")
    expect(found.status).toBe("ok")
  })

  it("多一点少一点措辞也能定位", () => {
    const found = locateFind(DOC, "判定标准（必须同时满足，缺一不可）：")
    expect(found.status).toBe("ok")
    expect(locateFind(DOC, "判定标准必须同时满足缺一不可").status).toBe("ok")
  })

  it("模糊匹配不会把不相干的句子硬套上去", () => {
    expect(locateFind(DOC, "这句话在原文里根本不存在").status).toBe("not-found")
    expect(locateFind(DOC, "请把这段话改写得更口语一些").status).toBe("not-found")
    expect(locateFind(DOC, "重要程度排序：高、中、低").status).toBe("not-found")
  })

  it("正文里出现重复段落时仍然报 ambiguous 而不是乱改", () => {
    const doc = "同一个字必须合并到同一个词条。\n\n中间内容\n\n同一个字必须合并到同一个词条。"
    expect(locateFind(doc, "同一个字必须合并到同一个词条。").status).toBe("ambiguous")
  })

  it("模板里有很多相似行时，靠逐字命中的锚点仍然能定位", () => {
    const doc = Array.from(
      { length: 200 },
      (_, i) => `### 第 ${i} 节\n\n这里是第 ${i} 段正文内容，用来模拟真实的长 Prompt 文本。`,
    ).join("\n\n")
    const found = locateFind(doc, "这里是第 42 段正文内容，用来模拟真实的长Prompt文本。")
    expect(found.status).toBe("ok")
    expect(doc.slice(found.start, found.end)).toBe("这里是第 42 段正文内容，用来模拟真实的长 Prompt 文本。")
  })

  it("模糊合并后不会残留重复内容", () => {
    const out = mergeEdits(DOC, [
      {
        find: "如果原文中有体现该义项的句子，必须保留原文例句。",
        replace:
          "如果原文中有体现该义项的句子：\n\n**必须保留原文例句。**\n\n而且必须补一条硬性规范。",
      },
    ])
    expect(out.outcomes[0].match).toBe("fuzzy")
    expect(out.applied).toBe(1)
    expect(out.content).toContain("而且必须补一条硬性规范。")
    // 原来那三行应该被整体替换掉，而不是被追加成第二遍
    expect(out.content.match(/必须保留原文例句/g)).toHaveLength(1)
  })

  it("定位耗时在长文档里也可接受", () => {
    const doc = Array.from({ length: 200 }, (_, i) => `### 第 ${i} 节\n\n第 ${i} 段正文。`).join("\n\n")
    const started = Date.now()
    const out = mergeEdits(
      doc,
      Array.from({ length: 10 }, (_, i) => ({ find: `第 ${i * 3} 段正文。`, replace: `第 ${i * 3} 段正文（改）。` })),
    )
    expect(out.applied).toBe(10)
    expect(Date.now() - started).toBeLessThan(2000)
  })
})

describe("mergeEdits", () => {
  it("applies a single edit", () => {
    const out = mergeEdits("请帮我修改作文。", [{ find: "修改作文", replace: "润色作文" }])
    expect(out.content).toBe("请帮我润色作文。")
    expect(out.applied).toBe(1)
    expect(out.failed).toBe(0)
  })

  it("applies several edits at once", () => {
    const source = "## 一、角色\n你是一名教师。\n\n## 二、要求\n1. 保留原意\n"
    const out = mergeEdits(source, [
      { find: "你是一名教师。", replace: "你是一名资深高中语文教师。" },
      { find: "1. 保留原意", replace: "1. 保留原意\n2. 修正语法" },
    ])
    expect(out.content).toContain("资深高中语文教师")
    expect(out.content).toContain("2. 修正语法")
    expect(out.applied).toBe(2)
  })

  it("keeps earlier positions valid when several edits are applied", () => {
    const source = "A\nB\nC\nD"
    const out = mergeEdits(source, [
      { find: "A", replace: "A-改了很多很多字" },
      { find: "D", replace: "D 改" },
    ])
    expect(out.content).toBe("A-改了很多很多字\nB\nC\nD 改")
  })

  it("applies whitespace tolerant edits", () => {
    const out = mergeEdits("第一条\n\n\n第二条", [{ find: "第一条\n第二条", replace: "第一条（改）\n第二条" }])
    expect(out.content.startsWith("第一条（改）")).toBe(true)
  })

  it("skips an edit that cannot be found", () => {
    const out = mergeEdits("原文", [{ find: "不存在的句子", replace: "x" }])
    expect(out.content).toBe("原文")
    expect(out.outcomes[0].status).toBe("not-found")
    expect(out.failed).toBe(1)
  })

  it("skips an ambiguous edit instead of guessing", () => {
    const out = mergeEdits("重复\n重复", [{ find: "重复", replace: "改" }])
    expect(out.content).toBe("重复\n重复")
    expect(out.outcomes[0].status).toBe("ambiguous")
  })

  it("skips overlapping edits", () => {
    const out = mergeEdits("abcdef", [
      { find: "bcde", replace: "X" },
      { find: "cd", replace: "Y" },
    ])
    expect(out.content).toBe("aXf")
    expect(out.outcomes.find((o) => o.edit.find === "cd")?.status).toBe("overlap")
  })

  it("appends when find is empty", () => {
    const out = mergeEdits("已有内容", [{ find: "", replace: "## 新增章节\n内容" }])
    expect(out.content).toBe("已有内容\n\n## 新增章节\n内容")
  })

  it("appends to empty content without leading blank lines", () => {
    expect(mergeEdits("", [{ find: "", replace: "新内容" }]).content).toBe("新内容")
  })

  it("handles a deleted block (empty replace)", () => {
    const out = mergeEdits("保留\n删掉这行\n保留", [{ find: "删掉这行\n", replace: "" }])
    expect(out.content).toBe("保留\n保留")
  })

  it("is a no-op for an empty edit list", () => {
    const out = mergeEdits("原文", [])
    expect(out.content).toBe("原文")
    expect(out.applied).toBe(0)
    expect(out.failed).toBe(0)
  })

  it("keeps outcomes aligned with the input order", () => {
    const out = mergeEdits("第一段\n第二段", [
      { find: "", replace: "## 追加" },
      { find: "不存在的句子", replace: "x" },
      { find: "第二段", replace: "第二段（改）" },
    ])
    expect(out.outcomes.map((o) => o.status)).toEqual(["applied", "not-found", "applied"])
    expect(out.applied).toBe(2)
    expect(out.failed).toBe(1)
    expect(out.content).toBe("第一段\n第二段（改）\n\n## 追加")
  })

  it("handles long prompts", () => {
    const source = Array.from({ length: 400 }, (_, i) => `第 ${i} 行内容`).join("\n")
    const out = mergeEdits(source, [
      { find: "第 100 行内容", replace: "第 100 行内容（已改）" },
      { find: "第 399 行内容", replace: "最后一行" },
    ])
    expect(out.content).toContain("第 100 行内容（已改）")
    expect(out.content.endsWith("最后一行")).toBe(true)
    expect(out.content.split("\n")).toHaveLength(400)
  })
})

describe("parseEdits", () => {
  it("reads find/replace pairs", () => {
    expect(parseEdits([{ find: "a", replace: "b" }])).toEqual([{ find: "a", replace: "b" }])
  })

  it("accepts alternative field names", () => {
    expect(parseEdits([{ old: "a", new: "b" }])).toEqual([{ find: "a", replace: "b" }])
    expect(parseEdits([{ search: "a", replacement: "b" }])).toEqual([{ find: "a", replace: "b" }])
  })

  it("drops empty and no-op entries", () => {
    expect(parseEdits([{ find: "a", replace: "a" }, { find: "", replace: "" }, { x: 1 }])).toEqual([])
  })

  it("ignores non arrays", () => {
    expect(parseEdits(null)).toEqual([])
    expect(parseEdits({ find: "a" })).toEqual([])
  })

  it("keeps an append-only edit", () => {
    expect(parseEdits([{ find: "", replace: "新增" }])).toEqual([{ find: "", replace: "新增" }])
  })
})
