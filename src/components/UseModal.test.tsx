import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { UseModal } from "./UseModal"
import { ToastProvider } from "@/hooks/useToast"
import type { Prompt } from "@/types"

const prompt: Prompt = {
  id: "p1",
  title: "Code Review",
  content: "请审查 {{code}}，重点：{{focus}}，再审查 {{code}}。",
  tags: [],
  favorite: false,
  created_at: 1,
  updated_at: 1,
}

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset()
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })
})

function renderUse(open = true, onMarkUsed = vi.fn()) {
  return render(
    <ToastProvider>
      <UseModal open={open} onClose={() => {}} prompt={prompt} onMarkUsed={onMarkUsed} />
    </ToastProvider>,
  )
}

describe("UseModal", () => {
  it("generates one input per unique variable (deduplicated)", () => {
    renderUse()
    expect(screen.getByLabelText(/Code/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Focus/)).toBeInTheDocument()
  })

  it("replaces repeated variable occurrences live in preview", async () => {
    renderUse()
    await userEvent.type(screen.getByLabelText(/Code/), "const a = 1")
    await userEvent.type(screen.getByLabelText(/Focus/), "性能")
    await waitFor(() => {
      expect(screen.getByText(/const a = 1，重点：性能，再审查 const a = 1/)).toBeInTheDocument()
    })
  })

  it("copies the final rendered prompt and marks it used", async () => {
    const onMarkUsed = vi.fn()
    renderUse(true, onMarkUsed)
    await userEvent.type(screen.getByLabelText(/Code/), "const a = 1")
    await userEvent.type(screen.getByLabelText(/Focus/), "性能")
    await userEvent.click(screen.getByRole("button", { name: /复制 Prompt/ }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("请审查 const a = 1，重点：性能，再审查 const a = 1。")
    })
    expect(onMarkUsed).toHaveBeenCalledWith("p1")
    // 按钮文案保持不变（宽度不会跳），反馈只在底部 toast 里
    expect(screen.getByRole("button", { name: /复制 Prompt/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /已复制/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole("status")).getByText("已复制")).toBeInTheDocument()
  })

  it("keeps unfilled variables replaced with empty string", async () => {
    renderUse()
    await userEvent.type(screen.getByLabelText(/Focus/), "重点")
    await waitFor(() => {
      expect(screen.getByText(/请审查 ，重点：重点，再审查 。/)).toBeInTheDocument()
    })
  })
})
