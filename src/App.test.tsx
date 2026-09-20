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

/** 搜索框下方的小按钮只管标签筛选；导航 / 类型 / 分类仍在侧栏。 */
async function openTagFilter() {
  await userEvent.click(screen.getByRole("button", { name: "筛选标签" }))
  return within(await screen.findByTestId("tag-filter-panel"))
}

const sidebar = () => within(screen.getByRole("complementary"))

describe("App integration", () => {
  it("renders seed prompts", () => {
    renderApp()
    expect(screen.getByText("PromptBox")).toBeInTheDocument()
    expect(screen.getByText("英语作文润色")).toBeInTheDocument()
    expect(screen.getByText("Code Review")).toBeInTheDocument()
  })

  it("filters by tag from the small menu next to the search bar", async () => {
    renderApp()
    const panel = await openTagFilter()
    await userEvent.click(panel.getByRole("button", { name: /^英语\s*\d+$/ }))
    expect(screen.getByText("英语作文润色")).toBeInTheDocument()
    expect(screen.queryByText("Code Review")).not.toBeInTheDocument()
    // 结果行里的胶囊是取消筛选的入口
    await userEvent.click(screen.getByRole("button", { name: "清除标签筛选：英语" }))
    expect(screen.getByText("Code Review")).toBeInTheDocument()
  })

  it("keeps tags out of the sidebar", () => {
    renderApp()
    const nav = sidebar()
    expect(nav.queryByText("标签")).not.toBeInTheDocument()
    // 标签只在搜索框下方的小按钮里
    expect(nav.queryByText("英语")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "筛选标签" })).toBeInTheDocument()
  })

  it("deletes a category from the sidebar without deleting its prompts", async () => {
    renderApp()
    const nav = sidebar()
    expect(nav.getByText("学习")).toBeInTheDocument()
    await userEvent.click(nav.getByRole("button", { name: "删除分类：学习" }))
    expect(screen.getByText(/确定删除分类「学习」吗/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "删除分类" }))
    await waitFor(() => expect(nav.queryByText("学习")).not.toBeInTheDocument())
    // Prompt 还在，只是变成「无分类」
    expect(screen.getByText("英语作文润色")).toBeInTheDocument()
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
    // 「常用」仍然在侧栏，而且只有它一个高亮
    const favoriteNav = sidebar().getByRole("button", { name: "常用" })
    await userEvent.click(favoriteNav)
    expect(await screen.findByText("英语作文润色")).toBeInTheDocument()
    expect(screen.queryByText("Code Review")).not.toBeInTheDocument()
    expect(sidebar().getByRole("button", { name: "常用" })).toHaveAttribute("aria-pressed", "true")
    expect(sidebar().getByRole("button", { name: "全部" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(sidebar().getByRole("button", { name: "全部" }))
    expect(screen.getByText("Code Review")).toBeInTheDocument()
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

  it("shows Chat/Agent badges and filters by type", async () => {
    renderApp()
    const card = screen.getByText("Code Review").closest('[data-testid="prompt-card"]') as HTMLElement
    expect(within(card).getByRole("button", { name: "Agent" })).toBeInTheDocument()
    await userEvent.click(sidebar().getByRole("button", { name: "本地 Agent" }))
    expect(await screen.findByText("Code Review")).toBeInTheDocument()
    expect(screen.queryByText("英语作文润色")).not.toBeInTheDocument()
  })

  it("creates a prompt with the Agent target", async () => {
    renderApp()
    await userEvent.click(screen.getAllByRole("button", { name: "新建" })[0])
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("标题"), "本地脚本提示")
    await userEvent.type(within(dialog).getByLabelText("内容"), "运行 {{cmd}}")
    await userEvent.click(within(dialog).getByRole("button", { name: /^Agent/ }))
    await userEvent.click(within(dialog).getByRole("button", { name: "保存" }))
    const card = (await screen.findByText("本地脚本提示")).closest(
      '[data-testid="prompt-card"]',
    ) as HTMLElement
    expect(within(card).getByRole("button", { name: "Agent" })).toBeInTheDocument()
  })
})
