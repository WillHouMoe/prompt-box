import { useEffect, useRef, useState } from "react"
import {
  Bot,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  KeyRound,
  ListPlus,
  CornerDownLeft,
  Wand2,
  AlertTriangle,
  Copy,
  RotateCcw,
} from "lucide-react"
import type { ChatMessage, PromptDraft, PromptTarget } from "@/types"
import { mergeEdits, type PromptEdit } from "@/lib/diffEdits"
import {
  askAssistant,
  DEEPSEEK_MODEL_LABEL,
  DeepSeekError,
  stripCodeFence,
} from "@/lib/deepseek"
import { TARGET_LABEL } from "@/lib/targets"
import { useClipboard } from "@/hooks/useClipboard"
import { cn } from "@/lib/utils"
import { MarkdownView } from "./MarkdownView"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"
import { Textarea } from "./ui/Textarea"
import { BetaBadge } from "./ui/BetaBadge"

interface PanelMessage {
  id: string
  role: "user" | "assistant"
  content: string
  draft?: PromptDraft
  /** 差分模式返回的改动片段。 */
  edits?: PromptEdit[]
  /** 输出被截断：内容可能不完整，不允许直接覆盖表单。 */
  truncated?: boolean
}

/** 超过这个长度就默认用差分模式，避免让 AI 重写全文。 */
const DIFF_MODE_THRESHOLD = 600

/** 把改动片段渲染成红删 / 绿增的 diff 块。 */
function EditDiff({ edits, content }: { edits: PromptEdit[]; content: string }) {
  const { outcomes } = mergeEdits(content, edits)
  return (
    <div className="mt-2 space-y-1.5">
      {edits.map((edit, index) => {
        const status = outcomes[index]?.status ?? "not-found"
        return (
          <div key={index} className="overflow-hidden rounded-md border border-slate-200">
            <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words bg-rose-50/70 px-2 py-1 font-mono text-[11px] leading-relaxed text-rose-700">
              {edit.find ? `- ${edit.find}` : "- （追加到正文末尾）"}
            </div>
            <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words bg-emerald-50/70 px-2 py-1 font-mono text-[11px] leading-relaxed text-emerald-800">
              {edit.replace ? `+ ${edit.replace}` : "+ （删除这段）"}
            </div>
            {status !== "applied" ? (
              <p className="bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                {status === "ambiguous"
                  ? "⚠️ 这段文字在正文里出现了多次，无法确定改哪一处，已跳过"
                  : status === "overlap"
                    ? "⚠️ 与上一处修改重叠，已跳过"
                    : "⚠️ 没能在正文中定位到这段原文，已跳过"}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function diffToText(edits: PromptEdit[]): string {
  return edits
    .map((e) => `- ${e.find || "（末尾）"}\n+ ${e.replace || "（删除）"}`)
    .join("\n\n")
}

interface AiAssistantProps {
  apiKey: string
  model: string
  baseUrl: string
  thinking: boolean
  title: string
  content: string
  target: PromptTarget
  tags: string[]
  categoryName?: string
  categoryNames: string[]
  onApplyContent: (text: string) => void
  onAppendContent: (text: string) => void
  onApplyDraft: (draft: PromptDraft) => void
  onApplyEdits: (edits: PromptEdit[]) => void
  onOpenSettings: () => void
  onSaveKey: (key: string) => void
}

const SUGGESTIONS = [
  "帮我写一个「英语作文润色」的 Prompt",
  "把这几个要求整理成一个结构清晰的 Prompt",
  "改成带 {{变量}} 占位符的通用模板",
]

let seq = 0
const nextId = () => `m${(seq += 1)}`

/** 说明这次「应用到表单」会影响哪些字段，以及正文字数会怎么变。 */
function draftScope(draft: PromptDraft, currentLength: number): string {
  const parts: string[] = []
  if (draft.title) parts.push("标题")
  const nextLength = draft.content?.length ?? 0
  // 编辑长 Prompt 时先让用户看到正文字数变化，避免误覆盖。
  parts.push(currentLength > 0 ? `内容 ${currentLength} → ${nextLength} 字` : "内容")
  if (draft.tags && draft.tags.length > 0) parts.push(`标签 ${draft.tags.map((t) => `#${t}`).join(" ")}`)
  if (draft.category) parts.push(`分类 ${draft.category}`)
  if (draft.target) parts.push(`类型 ${TARGET_LABEL[draft.target]}`)
  return parts.join(" · ")
}

export function AiAssistant({
  apiKey,
  model,
  baseUrl,
  thinking,
  title,
  content,
  target,
  tags,
  categoryName,
  categoryNames,
  onApplyContent,
  onAppendContent,
  onApplyDraft,
  onApplyEdits,
  onOpenSettings,
  onSaveKey,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [keyDraft, setKeyDraft] = useState("")
  const [lastSent, setLastSent] = useState("")
  // 长内容默认走差分模式：只让 AI 返回改动片段，更快也更不容易被截断。
  const [mode, setMode] = useState<"full" | "diff">(() =>
    content.trim().length >= DIFF_MODE_THRESHOLD ? "diff" : "full",
  )
  const { copy } = useClipboard()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    }
  }, [messages, loading])

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim()
    if (!text || loading) return
    if (!apiKey.trim()) {
      setError("请先填写 DeepSeek API Key")
      return
    }
    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: text },
    ]
    setMessages([...messages, { id: nextId(), role: "user", content: text }])
    setLastSent(text)
    setInput("")
    setError("")
    setLoading(true)
    try {
      const { reply, draft, edits, truncated } = await askAssistant({
        apiKey,
        model,
        baseUrl,
        thinking,
        context: {
          title,
          content,
          target,
          tags,
          category: categoryName,
          categoryNames,
        },
        messages: history,
        mode,
      })
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: reply, draft, edits, truncated },
      ])
    } catch (err) {
      setError(err instanceof DeepSeekError ? err.message : "请求失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  if (!apiKey.trim()) {
    return (
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
            <Bot size={16} className="text-indigo-600" />
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800">AI 助手 · DeepSeek</p>
            <BetaBadge />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          填写你自己的 DeepSeek API Key 后即可在这里对话，让 AI 帮你起草 Prompt。
          Key 只保存在本机浏览器中，不会上传到任何服务器。
        </p>
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label htmlFor="ds-key" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <KeyRound size={13} />
            DeepSeek API Key
          </label>
          <Input
            id="ds-key"
            type="password"
            placeholder="sk-..."
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-600 hover:underline"
            >
              获取 API Key
            </a>
            <Button
              variant="primary"
              size="sm"
              disabled={!keyDraft.trim()}
              onClick={() => {
                onSaveKey(keyDraft.trim())
                setKeyDraft("")
              }}
            >
              保存并开始
            </Button>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="focus-ring self-start text-xs text-slate-400 hover:text-slate-600"
        >
          前往设置（模型 / 深度思考）
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
          <Bot size={16} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            AI 助手 · DeepSeek
            <BetaBadge />
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {DEEPSEEK_MODEL_LABEL[model] ?? model}
            {thinking ? " · 深度思考" : ""}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            aria-label="清空对话"
            onClick={() => {
              setMessages([])
              setError("")
            }}
            className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div ref={listRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles size={13} />
              描述你想要什么，让 AI 帮你写 Prompt：
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              AI 会按 PromptBox 的格式返回：标题、正文（含 {"{{变量}}"}）、标签、分类和 Chat / Agent 类型，
              你确认后再决定是否写进表单。
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div
              key={m.id}
              className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2"
            >
              <MarkdownView content={m.content} />
              {m.edits && m.edits.length > 0 ? <EditDiff edits={m.edits} content={content} /> : null}
              {m.draft && !m.truncated && (
                <p className="mt-2 flex items-start gap-1 text-[11px] leading-relaxed text-slate-400">
                  <Wand2 size={12} className="mt-0.5 shrink-0" />
                  <span>将填入：{draftScope(m.draft, content.length)}</span>
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
                {m.edits && m.edits.length > 0 ? (
                  (() => {
                    const preview = mergeEdits(content, m.edits)
                    return (
                      <>
                        <button
                          onClick={() => onApplyEdits(m.edits as PromptEdit[])}
                          disabled={preview.applied === 0}
                          className="focus-ring inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CornerDownLeft size={12} />
                          {preview.failed === 0
                            ? `应用 ${preview.applied} 处修改`
                            : `应用 ${preview.applied} 处（${preview.failed} 处跳过）`}
                        </button>
                        <button
                          onClick={() => copy(diffToText(m.edits as PromptEdit[]))}
                          className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Copy size={12} />
                          复制差异
                        </button>
                        {lastSent ? (
                          <button
                            onClick={() => send(lastSent)}
                            className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <RotateCcw size={12} />
                            重新生成
                          </button>
                        ) : null}
                      </>
                    )
                  })()
                ) : m.truncated ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle size={12} />
                      输出被截断，未写入表单
                    </span>
                    <button
                      onClick={() => copy(m.draft?.content ?? m.content)}
                      className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Copy size={12} />
                      复制已生成部分
                    </button>
                    {lastSent ? (
                      <button
                        onClick={() => send(lastSent)}
                        className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <RotateCcw size={12} />
                        重新生成
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    {m.draft ? (
                      <button
                        onClick={() => onApplyDraft(m.draft as PromptDraft)}
                        className="focus-ring inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <CornerDownLeft size={12} />
                        应用到表单
                      </button>
                    ) : null}
                    <button
                      onClick={() =>
                        m.draft
                          ? onApplyContent(m.draft.content ?? "")
                          : onApplyContent(stripCodeFence(m.content))
                      }
                      className={cn(
                        "focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                        m.draft
                          ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                      )}
                    >
                      <CornerDownLeft size={12} />
                      只填入内容
                    </button>
                    <button
                      onClick={() =>
                        onAppendContent(
                          m.draft ? (m.draft.content ?? "") : stripCodeFence(m.content),
                        )
                      }
                      className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <ListPlus size={12} />
                      追加到内容
                    </button>
                  </>
                )}
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            {thinking ? "正在思考…（深度思考已开启，可能稍慢）" : "正在生成…"}
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">修改方式</span>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
            {(
              [
                { value: "diff", label: "差分", hint: "只返回改动片段，长 Prompt 更快更稳" },
                { value: "full", label: "全文", hint: "让 AI 返回完整正文" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={mode === opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "focus-ring px-2 py-0.5 text-[11px] font-medium transition-colors",
                  mode === opt.value
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">
            {mode === "diff"
              ? "AI 只给出改动片段，确认后合并进正文"
              : "AI 返回完整正文后覆盖表单"}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={input}
            placeholder="描述你想写的 Prompt，或让 AI 优化当前内容…（Enter 发送，Shift+Enter 换行）"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            className="resize-none"
          />
          <Button
            variant="primary"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="h-9 shrink-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
