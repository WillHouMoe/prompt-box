import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AiAssistant } from "./AiAssistant"

function setup(overrides: Partial<Parameters<typeof AiAssistant>[0]> = {}) {
  const onApplyContent = vi.fn()
  const onAppendContent = vi.fn()
  const onOpenSettings = vi.fn()
  const onSaveKey = vi.fn()
  render(
    <AiAssistant
      apiKey="sk-test"
      model="deepseek-chat"
      title=""
      content=""
      onApplyContent={onApplyContent}
      onAppendContent={onAppendContent}
      onOpenSettings={onOpenSettings}
      onSaveKey={onSaveKey}
      {...overrides}
    />,
  )
  return { onApplyContent, onAppendContent, onOpenSettings, onSaveKey }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "```\n你好 Prompt\n```" } }] }),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AiAssistant", () => {
  it("asks for an API key when none is configured", () => {
    setup({ apiKey: "" })
    expect(screen.getByLabelText(/DeepSeek API Key/)).toBeInTheDocument()
  })

  it("saves a typed API key", async () => {
    const { onSaveKey } = setup({ apiKey: "" })
    await userEvent.type(screen.getByLabelText(/DeepSeek API Key/), "sk-new")
    await userEvent.click(screen.getByRole("button", { name: /保存并开始/ }))
    expect(onSaveKey).toHaveBeenCalledWith("sk-new")
  })

  it("sends a message and applies the reply (stripping code fences)", async () => {
    const { onApplyContent } = setup()
    await userEvent.type(
      screen.getByPlaceholderText(/描述你想写的 Prompt/),
      "帮我写一个润色作文的 Prompt",
    )
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    const applyBtn = await screen.findByRole("button", { name: /填入内容/ })
    await userEvent.click(applyBtn)
    expect(onApplyContent).toHaveBeenCalledWith("你好 Prompt")
  })

  it("can append the reply to the content", async () => {
    const { onAppendContent } = setup()
    await userEvent.type(screen.getByPlaceholderText(/描述你想写的 Prompt/), "再来一个")
    await userEvent.click(screen.getByRole("button", { name: /发送/ }))
    const appendBtn = await screen.findByRole("button", { name: /追加到内容/ })
    await userEvent.click(appendBtn)
    expect(onAppendContent).toHaveBeenCalledWith("你好 Prompt")
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
