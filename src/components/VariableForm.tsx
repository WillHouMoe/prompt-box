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

/** 从名字就能看出内容会比较长的变量，输入框一开始就给大一点。 */
const LONG_CONTENT_WORDS = [
  "essay",
  "article",
  "code",
  "prompt",
  "text",
  "content",
  "context",
  "document",
  "message",
  "source",
  "原文",
  "文本",
  "正文",
  "文章",
  "作文",
  "代码",
  "内容",
  "材料",
  "段落",
  "语料",
  "题目",
]

function isLongContentName(name: string): boolean {
  const lower = name.toLowerCase()
  return LONG_CONTENT_WORDS.some((word) => lower.includes(word))
}

/**
 * 变量填写表单。
 *
 * 每个变量都是可以输入多行的输入框（会随着内容自己变高），名字里带
 * 「文章 / essay / code」这类词的只是起始更高一些——所有变量都能换行粘贴，
 * 不存在「这个变量只能填一行」的限制。
 */
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
              minRows={isLongContentName(name) ? 5 : 2}
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
