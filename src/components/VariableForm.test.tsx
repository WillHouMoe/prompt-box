import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { VariableForm } from "./VariableForm"

describe("VariableForm", () => {
  it("每个变量都是可输入多行的输入框，名字不决定能不能换行", () => {
    render(
      <VariableForm
        variables={["essay", "focus", "name", "要求", "q1"]}
        values={{}}
        onChange={() => {}}
      />,
    )
    const boxes = screen.getAllByRole("textbox")
    expect(boxes).toHaveLength(5)
    // 全部都是 textarea，不存在「只能填一行」的 input
    for (const box of boxes) {
      expect(box.tagName).toBe("TEXTAREA")
    }
  })

  it("名字里带 essay / code / 内容 的变量起始更高一些", () => {
    render(
      <VariableForm variables={["essay", "name"]} values={{}} onChange={() => {}} />,
    )
    expect(screen.getByLabelText(/Essay/)).toHaveAttribute("rows", "5")
    expect(screen.getByLabelText(/Name/)).toHaveAttribute("rows", "2")
  })

  it("换行内容会原样保留", async () => {
    const onChange = vi.fn()
    render(<VariableForm variables={["focus"]} values={{ focus: "第一行\n第二行" }} onChange={onChange} />)
    const box = screen.getByLabelText(/Focus/)
    expect(box).toHaveValue("第一行\n第二行")

    await userEvent.type(box, "\n第三行")
    const last = onChange.mock.calls.at(-1)?.[0] as Record<string, string>
    expect(last.focus).toContain("\n")
  })

  it("没有变量时给出提示", () => {
    render(<VariableForm variables={[]} values={{}} onChange={() => {}} />)
    expect(screen.getByText(/没有需要填写的变量/)).toBeInTheDocument()
    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
  })

  it("readOnly 时不可编辑", () => {
    render(
      <VariableForm variables={["essay"]} values={{ essay: "内容" }} onChange={() => {}} readOnly />,
    )
    expect(screen.getByLabelText(/Essay/)).toHaveAttribute("readonly")
  })
})
