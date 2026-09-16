import type { ChatMessage, PromptDraft } from "@/types"

/**
 * DeepSeek 的 OpenAI 兼容接口地址。
 * 浏览器可以直接调用（官方接口会回显 Origin，CORS 是放行的），不需要任何后端代理。
 */
export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com"

/** 当前在售模型（旧的 deepseek-chat / deepseek-reasoner 已下线）。 */
export const DEEPSEEK_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const
export type DeepSeekModel = (typeof DEEPSEEK_MODELS)[number]

export const DEEPSEEK_MODEL_LABEL: Record<string, string> = {
  "deepseek-flash": "DeepSeek V4.1 Flash",
  "deepseek-v4-pro": "DeepSeek V4 Pro",
}

export const DEEPSEEK_MODEL_HINT: Record<string, string> = {
  "deepseek-flash": "快、便宜，起草 Prompt 够用",
  "deepseek-v4-pro": "更强，复杂 Prompt 更稳",
}

export const DEFAULT_DEEPSEEK_MODEL: DeepSeekModel = "deepseek-flash"

export type ReasoningEffort = "low" | "high" | "max"

export const REASONING_EFFORT_LABEL: Record<ReasoningEffort, string> = {
  low: "低",
  high: "高",
  max: "最高",
}

export type DeepSeekErrorCode = "missing-key" | "network" | "http" | "empty"

export class DeepSeekError extends Error {
  code: DeepSeekErrorCode
  status?: number

  constructor(message: string, code: DeepSeekErrorCode = "http", status?: number) {
    super(message)
    this.name = "DeepSeekError"
    this.code = code
    this.status = status
  }
}

/** Status code -> 普通用户能看懂的一句话。 */
const STATUS_MESSAGE: Record<number, string> = {
  400: "请求格式有误（400），请检查模型是否可用",
  401: "DeepSeek API Key 无效或未授权（401），请在设置里重新填写",
  402: "DeepSeek 账户余额不足（402），请先到官网充值",
  422: "请求参数不合法（422），请在设置里更换模型后重试",
  429: "请求太频繁了（429），请稍等一会儿再试",
  500: "DeepSeek 服务异常（500），请稍后重试",
  503: "DeepSeek 服务繁忙（503），请稍后重试",
}

export function chatEndpoint(baseUrl?: string): string {
  const base = (baseUrl ?? "").trim() || DEEPSEEK_DEFAULT_BASE_URL
  return `${base.replace(/\/+$/, "")}/chat/completions`
}

export interface AssistantContext {
  title?: string
  content?: string
  target?: string
  tags?: string[]
  category?: string
  /** PromptBox 里当前可选的分类名，供 AI 选择。 */
  categoryNames?: string[]
}

/**
 * PromptBox 给 AI 的默认系统提示词。
 *
 * 关键点（也是接入 AI 助手最容易翻车的地方）：
 * 1. 说清产品是什么、Prompt 会被粘贴到哪里，避免 AI 写成一段"聊天回答"。
 * 2. 明确输出契约：一个 JSON 对象，结构固定，并给出示例。
 * 3. 明确内容规则：{{变量}} 占位符、正文不套代码块、不寒暄。
 * 4. 带上当前编辑中的 Prompt 上下文，让 AI 在用户已有内容上改，而不是从零瞎写。
 */
export function buildSystemPrompt(context: AssistantContext = {}): string {
  const categories =
    context.categoryNames && context.categoryNames.length > 0
      ? context.categoryNames.join(" / ")
      : "学习 / 编程 / 写作 / 工作 / 生活 / 其他"

  const lines = [
    "你是 PromptBox 内置的 Prompt 写作助手（功能标记为 Beta）。",
    "",
    "PromptBox 是一个个人 Prompt 工具箱：用户把经常使用的 Prompt 存起来，用 {{变量名}} 标记每次使用时需要填写的内容，使用时自动生成表单并一键复制最终文本。Prompt 最终会被用户粘贴到网页版 AI 对话框（Chat）或本地 Agent（Claude Code、Cursor、Codex 等，Agent）里执行。",
    "",
    "## 你的任务",
    "把用户的一句话需求，变成一条能直接存进 PromptBox、并且每天都能用的 Prompt。",
    "",
    "## 内容规则（必须遵守）",
    "1. 需要用户每次填写的内容，写成 {{变量名}} 占位符，例如 {{essay}}、{{code}}。",
    "   - 变量名用简短英文小写，多个单词用下划线连接，不要用中文、空格或标点。",
    "   - 同一个变量在正文里出现多次时，变量名必须完全一致。",
    "2. content 是要直接粘贴使用的完整正文：不要寒暄，不要解释，不要在正文外面套 ``` 代码块，不要写“以下是我的 Prompt”之类的话。",
    "3. 正文结构：先写角色与目标，再写具体要求（用编号列表），最后写输出格式要求。",
    "4. 不要编造用户没有提供的事实；不确定的具体内容一律留给变量。",
    "5. title 用 10 个字以内的中文短语；tags 最多 5 个中文短词；category 只能从下面的分类里选一个，选不到就给空字符串。",
    `6. 分类可选值：${categories}`,
    '7. target：给网页对话框用填 "chat"；给能读写文件的本地 Agent 用填 "agent"。用户没说就按当前上下文推断，默认 "chat"。',
    "",
    "## 输出格式",
    "只输出一个 JSON 对象，不要输出任何其他文字，也不要包在代码块里。json 结构如下：",
    "{",
    '  "reply": "用 1-2 句中文说明你做了什么、用户还可以改哪里",',
    '  "draft": {',
    '    "title": "英语作文润色",',
    '    "content": "请帮我修改下面的英语作文。\\n\\n要求：\\n1. 保留原意\\n2. 修正语法错误\\n3. 使用更自然的表达\\n\\n作文：\\n{{essay}}",',
    '    "tags": ["英语", "写作"],',
    '    "category": "学习",',
    '    "target": "chat"',
    "  }",
    "}",
    "如果用户只是在提问、或不需要生成/修改 Prompt，把 draft 设为 null，只在 reply 里回答。",
  ]

  const current: string[] = []
  if (context.title?.trim()) current.push(`标题：${context.title.trim()}`)
  if (context.category?.trim()) current.push(`分类：${context.category.trim()}`)
  if (context.target?.trim()) current.push(`类型：${context.target.trim()}`)
  if (context.tags && context.tags.length > 0) current.push(`标签：${context.tags.join("、")}`)
  if (context.content?.trim()) current.push("", "当前内容：", context.content.trim())

  if (current.length > 0) {
    lines.push("", "## 用户当前正在编辑的 Prompt", ...current)
  }
  lines.push("", "用户可能只是想微调当前内容，请优先在现有内容上修改。")
  return lines.join("\n")
}

export interface ChatOptions {
  apiKey: string
  model?: string
  baseUrl?: string
  /** 深度思考模式（DeepSeek 默认开启，这里显式传参）。 */
  thinking?: boolean
  reasoningEffort?: ReasoningEffort
  messages: ChatMessage[]
  signal?: AbortSignal
  /** 要求接口返回单个 JSON 对象（json_object 模式）。 */
  json?: boolean
  maxTokens?: number
}

/** Call the DeepSeek chat completions API (OpenAI-compatible) from the browser. */
export async function chatWithDeepSeek({
  apiKey,
  model = DEFAULT_DEEPSEEK_MODEL,
  baseUrl,
  thinking = false,
  reasoningEffort = "high",
  messages,
  signal,
  json = false,
  maxTokens,
}: ChatOptions): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new DeepSeekError("请先填写 DeepSeek API Key", "missing-key")
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    thinking: { type: thinking ? "enabled" : "disabled" },
  }
  if (thinking) body.reasoning_effort = reasoningEffort
  if (json) {
    body.response_format = { type: "json_object" }
    // json_object 模式下必须给足 max_tokens，否则 JSON 会被截断。
    body.max_tokens = maxTokens ?? 4096
  } else if (maxTokens) {
    body.max_tokens = maxTokens
  }

  let res: Response
  try {
    res = await fetch(chatEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err
    throw new DeepSeekError(
      "无法连接 DeepSeek：请检查网络是否正常，然后重试。",
      "network",
    )
  }

  if (!res.ok) {
    let detail = ""
    try {
      const data = (await res.json()) as { error?: { message?: string } }
      detail = data?.error?.message ?? ""
    } catch {
      /* ignore non-JSON error bodies */
    }
    const base = STATUS_MESSAGE[res.status] ?? `DeepSeek 请求失败（${res.status}）`
    const message =
      res.status === 401 || res.status === 402 || res.status === 429
        ? base
        : `${base}${detail ? `：${detail}` : ""}`
    throw new DeepSeekError(message, "http", res.status)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  // 思考模式下会有 reasoning_content，这里只要最终答案。
  const content = data?.choices?.[0]?.message?.content ?? ""
  if (!content.trim()) {
    throw new DeepSeekError("DeepSeek 没有返回内容，请再试一次。", "empty")
  }
  return content
}

/** Remove a wrapping ``` code fence if the model added one. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n?```$/)
  return match ? match[1].trim() : trimmed
}

/**
 * 从模型输出里找出第一个完整的 JSON 对象。
 * 模型偶尔会在 JSON 前后加一句话，所以按大括号配对扫描，并跳过字符串内部的括号。
 */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function cleanString(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

/** 把模型输出的对象规整成 PromptBox 能用的 draft；内容为空则视为没有草稿。 */
export function normalizeDraft(value: unknown): PromptDraft | undefined {
  const raw = asRecord(value)
  if (!raw) return undefined

  const content = typeof raw.content === "string" ? raw.content.replace(/^\s+|\s+$/g, "") : ""
  if (!content) return undefined

  const tags = Array.isArray(raw.tags)
    ? Array.from(
        new Set(
          raw.tags
            .map((t) => cleanString(t, 24))
            .filter(Boolean),
        ),
      ).slice(0, 5)
    : []

  const target = raw.target === "agent" ? "agent" : raw.target === "chat" ? "chat" : undefined

  return {
    title: cleanString(raw.title, 60) || undefined,
    content,
    tags,
    category: cleanString(raw.category, 24) || undefined,
    target,
  }
}

export function parsePromptDraft(raw: string): PromptDraft | undefined {
  const json = extractJsonObject(stripCodeFence(raw))
  if (!json) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return undefined
  }
  const record = asRecord(parsed)
  if (!record) return undefined
  // 兼容两种返回：{reply, draft} 或直接返回草稿本身。
  return normalizeDraft(record.draft ?? record)
}

export interface AssistantReply {
  /** 展示在对话气泡里的说明文字。 */
  reply: string
  /** AI 生成的 Prompt 草稿，可直接应用到表单。 */
  draft?: PromptDraft
}

/** 解析一次 AI 回答：优先读结构化 JSON，失败就退化成纯文本回答。 */
export function parseAssistantReply(raw: string): AssistantReply {
  const text = stripCodeFence(raw)
  const json = extractJsonObject(text)
  if (json) {
    try {
      const record = asRecord(JSON.parse(json))
      if (record) {
        const reply = cleanString(record.reply, 1000)
        const draft = normalizeDraft(record.draft ?? (record.content ? record : undefined))
        if (reply || draft) {
          return {
            reply: reply || "已经帮你写好草稿了，直接点「应用到表单」即可。",
            draft,
          }
        }
      }
    } catch {
      /* 落到下面的纯文本分支 */
    }
  }
  return { reply: text }
}

export interface AskOptions {
  apiKey: string
  model?: string
  baseUrl?: string
  thinking?: boolean
  context?: AssistantContext
  messages: ChatMessage[]
  signal?: AbortSignal
}

/**
 * 一次完整的 AI 助手调用：带上 PromptBox 的默认系统提示词，用 JSON 模式拿到
 * 「说明 + 草稿」结构，保证结果一定能落到网站自己的字段上。
 */
export async function askAssistant({
  apiKey,
  model,
  baseUrl,
  thinking,
  context,
  messages,
  signal,
}: AskOptions): Promise<AssistantReply> {
  const payload: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(context) },
    ...messages,
  ]
  try {
    const raw = await chatWithDeepSeek({
      apiKey,
      model,
      baseUrl,
      thinking,
      messages: payload,
      signal,
      json: true,
    })
    return parseAssistantReply(raw)
  } catch (err) {
    // JSON 模式偶发返回空内容，退化成一次普通对话，至少让用户拿到文字。
    if (err instanceof DeepSeekError && err.code === "empty") {
      const raw = await chatWithDeepSeek({
        apiKey,
        model,
        baseUrl,
        thinking,
        messages: payload,
        signal,
      })
      return { reply: stripCodeFence(raw) }
    }
    throw err
  }
}
