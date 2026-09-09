import { useMemo } from "react"
import { Textarea } from "./ui/Textarea"
import { Input } from "./ui/Input"

interface VariableFormProps {
  variables: string[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  readOnly?: boolean
}

function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * Decide whether a variable should render as a textarea (longer input).
 * Heuristic: longer names imply longer content, or known "long content" names.
 */
function isLongField(name: string): boolean {
  const longWords = ["essay", "article", "code", "prompt", "text", "content", "context", "输入", "文章", "作文", "代码", "正文", "内容"]
  const lower = name.toLowerCase()
  return longWords.some((w) => lower.includes(w))
}

export function VariableForm({ variables, values, onChange, readOnly }: VariableFormProps) {
  const order = useMemo(() => variables, [variables])

  if (order.length === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
        这个 Prompt 没有需要填写的变量。
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {order.map((name) => (
        <div key={name} className="space-y-1.5">
          <label htmlFor={`var-${name}`} className="text-xs font-semibold text-slate-700">
            {humanize(name)}
            <span className="ml-1 font-mono text-[10px] normal-case text-slate-400">
              {`{{${name}}}`}
            </span>
          </label>
          {isLongField(name) ? (
            <Textarea
              id={`var-${name}`}
              rows={5}
              readOnly={readOnly}
              placeholder={`输入 ${humanize(name)}…`}
              value={values[name] ?? ""}
              onChange={(e) => onChange({ ...values, [name]: e.target.value })}
              className="resize-y"
            />
          ) : (
            <Input
              id={`var-${name}`}
              readOnly={readOnly}
              placeholder={`输入 ${humanize(name)}…`}
              value={values[name] ?? ""}
              onChange={(e) => onChange({ ...values, [name]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  )
}
