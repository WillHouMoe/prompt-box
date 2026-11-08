import { useMemo } from "react"
import { AutoTextarea, Textarea } from "./ui/Textarea"

interface VariableFormProps {
  variables: string[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  readOnly?: boolean
  /** 让输入框填满可用高度；长内容在输入框内滚动。 */
  fill?: boolean
}

function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * 变量填写表单。
 *
 * 普通表单使用自动长高的多行输入框；工作区模式则让各变量平分可用高度，
 * 长内容在各自输入框内滚动，和右侧 Preview 共用稳定的双栏高度。
 */
const VARIABLE_ROWS = 5
export function VariableForm({ variables, values, onChange, readOnly, fill }: VariableFormProps) {
  const order = useMemo(() => variables, [variables])

  if (order.length === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
        这个 Prompt 没有需要填写的变量。
      </p>
    )
  }

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4"}>
      {order.map((name) => {
        const label = humanize(name)
        return (
          <div
            key={name}
            className={
              fill ? "flex min-h-36 flex-1 flex-col gap-1.5" : "space-y-1.5"
            }
          >
            <label htmlFor={`var-${name}`} className="text-xs font-semibold text-slate-700">
              {label}
              <span className="ml-1 font-mono text-[10px] normal-case text-slate-400">
                {`{{${name}}}`}
              </span>
            </label>
            {fill ? (
              <Textarea
                id={`var-${name}`}
                rows={VARIABLE_ROWS}
                readOnly={readOnly}
                placeholder={`输入 ${label}…（可换行）`}
                value={values[name] ?? ""}
                onChange={(e) => onChange({ ...values, [name]: e.target.value })}
                className="min-h-0 flex-1 resize-none focus-visible:ring-inset"
              />
            ) : (
              <AutoTextarea
                id={`var-${name}`}
                minRows={VARIABLE_ROWS}
                readOnly={readOnly}
                placeholder={`输入 ${label}…（可换行）`}
                value={values[name] ?? ""}
                onChange={(e) => onChange({ ...values, [name]: e.target.value })}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
