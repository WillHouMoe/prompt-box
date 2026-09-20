import { useMemo } from "react"
import { AutoTextarea } from "./ui/Textarea"

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
 * 变量填写表单。
 *
 * 所有变量都用同样的多行输入框：高度统一（5 行），内容多了会自己继续长高，
 * 所以既不用猜「这个变量能不能填很多行」，也不会出现有的框高有的框矮。
 */
const VARIABLE_ROWS = 5
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
      {order.map((name) => {
        const label = humanize(name)
        return (
          <div key={name} className="space-y-1.5">
            <label htmlFor={`var-${name}`} className="text-xs font-semibold text-slate-700">
              {label}
              <span className="ml-1 font-mono text-[10px] normal-case text-slate-400">
                {`{{${name}}}`}
              </span>
            </label>
            <AutoTextarea
              id={`var-${name}`}
              minRows={VARIABLE_ROWS}
              readOnly={readOnly}
              placeholder={`输入 ${label}…（可换行）`}
              value={values[name] ?? ""}
              onChange={(e) => onChange({ ...values, [name]: e.target.value })}
            />
          </div>
        )
      })}
    </div>
  )
}
