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
      onOpenSettings={onOpenSettings}
      onSaveKey={onSaveKey}
      {...overrides}
    />,
  )
  return { onApplyContent, onAppendContent, onApplyDraft, onOpenSettings, onSaveKey }
}

function stubReply(content: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] }),
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
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ reply: "ok" }) } }] }),
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

  it("falls back to plain text when the model ignores the JSON contract", async () => {
    stubReply("```\n你好 Prompt\n```")
    const { onApplyContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "hi")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    await userEvent.click(await screen.findByRole("button", { name: /只填入内容/ }))
    expect(onApplyContent).toHaveBeenCalledWith("你好 Prompt")
    expect(screen.queryByRole("button", { name: /应用到表单/ })).toBeNull()
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
