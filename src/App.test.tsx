import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"
import { ToastProvider } from "@/hooks/useToast"
import { PromptStoreProvider } from "@/store/promptStore"

const writeText = vi.fn()

function renderApp() {
  return render(
    <ToastProvider>
      <PromptStoreProvider>
        <App />
      </PromptStoreProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  writeText.mockReset()
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })
})

describe("App integration", () => {
  it("renders seed prompts", () => {
    renderApp()
    expect(screen.getByText("PromptBox")).toBeInTheDocument()
    expect(screen.getByText("英语作文润色")).toBeInTheDocument()
    expect(screen.getByText("Code Review")).toBeInTheDocument()
  })

  it("searches prompts in real time", async () => {
    renderApp()
    const search = screen.getByLabelText("搜索 Prompt")
    await userEvent.type(search, "润色")
    expect(screen.getByText("英语作文润色")).toBeInTheDocument()
    expect(screen.queryByText("Code Review")).not.toBeInTheDocument()
  })

  it("filters favorites and requires a star to add", async () => {
    renderApp()
    const card = screen.getByText("英语作文润色").closest('[data-testid="prompt-card"]') as HTMLElement
    const star = within(card).getByRole("button", { name: "收藏" })
    await userEvent.click(star)
    await userEvent.click(screen.getByRole("button", { name: /常用/ }))
    expect(await screen.findByText("英语作文润色")).toBeInTheDocument()
    expect(screen.queryByText("Code Review")).not.toBeInTheDocument()
  })

  it("uses a prompt: fills variable and copies the final rendered prompt", async () => {
    renderApp()
    const card = screen.getByText("英语作文润色").closest('[data-testid="prompt-card"]') as HTMLElement
    await userEvent.click(within(card).getByRole("button", { name: "使用" }))
    const input = screen.getByLabelText(/Essay/)
    await userEvent.type(input, "I am happy.")
    await waitFor(() => {
      expect(screen.getAllByText(/I am happy/).length).toBeGreaterThanOrEqual(1)
    })
    await userEvent.click(screen.getByRole("button", { name: /复制 Prompt/ }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })
    const finalText = writeText.mock.calls[0][0] as string
    expect(finalText).toContain("I am happy.")
    expect(finalText).not.toContain("{{essay}}")
  })
})
