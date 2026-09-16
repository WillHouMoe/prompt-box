import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AiAssistant } from "./AiAssistant"

const DRAFT = {
  title: "英语作文润色",
  content: "请帮我修改下面的作文：\n\n{{essay}}",
  tags: ["英语", "写作"],
  category: "学习",
  target: "chat" as const,
}

function setup(overrides: Partial<Parameters<typeof AiAssistant>[0]> = {}) {
  const onApplyContent = vi.fn()
  const onAppendContent = vi.fn()
  const onApplyDraft = vi.fn()
  const onApplyEdits = vi.fn()
  const onOpenSettings = vi.fn()
  const onSaveKey = vi.fn()
  render(
    <AiAssistant
      apiKey="sk-test"
      model="deepseek-flash"
      baseUrl="https://api.deepseek.com"
      thinking={false}
      title=""
      content=""
      target="chat"
      tags={[]}
      categoryNames={["学习", "编程"]}
      onApplyContent={onApplyContent}
      onAppendContent={onAppendContent}
      onApplyDraft={onApplyDraft}
      onApplyEdits={onApplyEdits}
      onOpenSettings={onOpenSettings}
      onSaveKey={onSaveKey}
      {...overrides}
    />,
  )
  return { onApplyContent, onAppendContent, onApplyDraft, onApplyEdits, onOpenSettings, onSaveKey }
}

function stubReply(content: string, finishReason = "stop") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content }, finish_reason: finishReason }] }),
    })),
  )
}

beforeEach(() => {
  stubReply(JSON.stringify({ reply: "已经写好了", draft: DRAFT }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AiAssistant", () => {
  it("asks for an API key when none is configured", () => {
    setup({ apiKey: "" })
    expect(screen.getByLabelText(/DeepSeek API Key/)).toBeInTheDocument()
  })

  it("marks the feature as beta", () => {
    setup()
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0)
  })

  it("saves a typed API key", async () => {
    const { onSaveKey } = setup({ apiKey: "" })
    await userEvent.type(screen.getByLabelText(/DeepSeek API Key/), "sk-new")
    await userEvent.click(screen.getByRole("button", { name: /保存并开始/ }))
    expect(onSaveKey).toHaveBeenCalledWith("sk-new")
  })

  it("sends the PromptBox system prompt so the AI knows the format", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ reply: "ok" }) }, finish_reason: "stop" },
        ],
      }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    setup({ thinking: true })
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "写一个润色作文的")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0].role).toBe("system")
    expect(body.messages[0].content).toContain("{{变量名}}")
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.thinking).toEqual({ type: "enabled" })
    // a hard-coded small max_tokens is what truncated long prompts into invalid JSON
    expect(body.max_tokens).toBeUndefined()
  })

  it("refuses to write a truncated draft into the form", async () => {
    stubReply(
      '{"reply":"我补好了第十七条","draft":{"title":"文言实词表","content":"# 任务\\n\\n第一段',
      "length",
    )
    const { onApplyDraft, onApplyContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "帮我补充一条规则")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await screen.findByText(/输出被截断/)

    expect(onApplyDraft).not.toHaveBeenCalled()
    expect(onApplyContent).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /应用到表单/ })).toBeNull()
    // the raw JSON must never be rendered to the user
    expect(screen.queryByText(/\{"reply"/)).toBeNull()
    expect(screen.getByText("我补好了第十七条")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /重新生成/ })).toBeInTheDocument()
  })

  it("applies the whole draft to the form", async () => {
    const { onApplyDraft } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "写一个润色作文的")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /应用到表单/ }))
    expect(onApplyDraft).toHaveBeenCalledWith(DRAFT)
  })

  it("can fill only the content of a draft", async () => {
    const { onApplyContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "写一个润色作文的")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /只填入内容/ }))
    expect(onApplyContent).toHaveBeenCalledWith(DRAFT.content)
  })

  it("can append the reply to the content", async () => {
    const { onAppendContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "再来一个")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /追加到内容/ }))
    expect(onAppendContent).toHaveBeenCalledWith(DRAFT.content)
  })

  it("shows how the content length will change before applying", async () => {
    setup({ content: "短的旧内容" })
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "改一下")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    expect(await screen.findByText(/内容 5 → \d+ 字/)).toBeInTheDocument()
  })

  it("falls back to plain text when the model ignores the JSON contract", async () => {
    stubReply("```\n你好 Prompt\n```")
    const { onApplyContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "hi")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /只填入内容/ }))
    expect(onApplyContent).toHaveBeenCalledWith("你好 Prompt")
    expect(screen.queryByRole("button", { name: /应用到表单/ })).toBeNull()
  })

  it("defaults to diff mode for long prompts and merges the edits", async () => {
    const longContent = "# 任务\n\n" + "正文内容。".repeat(150) + "\n最后一行特殊内容"
    stubReply(
      JSON.stringify({
        reply: "我把要求改成三条了",
        edits: [{ find: "最后一行特殊内容", replace: "改过的最后一行" }],
      }),
    )
    const { onApplyEdits } = setup({ content: longContent })
    // the mode toggle should already be on 差分
    expect(screen.getByRole("button", { name: "差分" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "改成三条要求")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /应用 1 处修改/ }))
    expect(onApplyEdits).toHaveBeenCalledWith([
      { find: "最后一行特殊内容", replace: "改过的最后一行" },
    ])
  })

  it("renders the diff before applying", async () => {
    stubReply(
      JSON.stringify({
        reply: "改好了",
        edits: [{ find: "保留原意。", replace: "保留原意，并修正语法。" }],
      }),
    )
    setup({ content: "第一段内容。\n保留原意。\n第三段内容。" + "正文内容。".repeat(60) })
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "改一下")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    expect(await screen.findByText(/- 保留原意。/)).toBeInTheDocument()
    expect(screen.getByText(/\+ 保留原意，并修正语法。/)).toBeInTheDocument()
  })

  it("warns when an edit cannot be located", async () => {
    stubReply(
      JSON.stringify({
        reply: "改好了",
        edits: [{ find: "原文里没有这句话", replace: "x" }],
      }),
    )
    setup({ content: "正文内容。".repeat(100) })
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "改一下")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    expect(await screen.findByText(/没能在正文中定位/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /应用 0 处/ })).toBeDisabled()
  })

  it("surfaces an error when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      }),
    )
    setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "hi")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await waitFor(() => {
      expect(screen.getByText(/无法连接/)).toBeInTheDocument()
    })
  })
})
