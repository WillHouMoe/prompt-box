import type { ChatMessage } from "@/types"

export const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"

export const DEEPSEEK_MODELS = ["deepseek-chat", "deepseek-reasoner"] as const
export const DEEPSEEK_MODEL_LABEL: Record<string, string> = {
  "deepseek-chat": "DeepSeek V3（deepseek-chat）",
  "deepseek-reasoner": "DeepSeek R1（deepseek-reasoner）",
}
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat"

export class DeepSeekError extends Error {}

/**
 * Instruction that turns the model into a prompt-writing assistant.
 * Context about the prompt being edited helps it produce something usable.
 */
export function buildSystemPrompt(context: { title?: string; content?: string }): string {
  const lines = [
    "你是 PromptBox 的 Prompt 写作助手，帮助用户撰写或优化可复用的 Prompt。",
    "",
    "规则：",
    "1. 当用户需要生成或优化 Prompt 时，直接输出完整、可直接使用的 Prompt 正文：不要寒暄、不要解释、不要用代码块包裹整段。",
    "2. 需要用户每次填写的内容用 {{变量名}} 表示，变量名用简洁英文，例如 {{essay}}、{{code}}。",
    "3. 结构清晰、语言简洁，可以使用简短编号或分段。",
    "4. 如果用户只是提问或需要讨论，正常回答即可。",
  ]
  if (context.title && context.title.trim()) {
    lines.push("", `当前标题：${context.title.trim()}`)
  }
  if (context.content && context.content.trim()) {
    lines.push("", "当前内容：", context.content.trim())
  }
  return lines.join("\n")
}

export interface ChatOptions {
  apiKey: string
  model?: string
  messages: ChatMessage[]
  signal?: AbortSignal
}

/** Call the DeepSeek chat completions API (OpenAI-compatible) from the browser. */
export async function chatWithDeepSeek({
  apiKey,
  model = DEFAULT_DEEPSEEK_MODEL,
  messages,
  signal,
}: ChatOptions): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new DeepSeekError("请先填写 DeepSeek API Key")
  }

  let res: Response
  try {
    res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
      }),
      signal,
    })
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err
    throw new DeepSeekError(
      "无法连接 DeepSeek：请检查网络，或该接口在当前浏览器中被跨域(CORS)限制。",
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
    if (res.status === 401) throw new DeepSeekError("DeepSeek API Key 无效或未授权（401）。")
    if (res.status === 402) throw new DeepSeekError("DeepSeek 账户余额不足（402）。")
    if (res.status === 429) throw new DeepSeekError("请求过于频繁，请稍后再试（429）。")
    throw new DeepSeekError(
      `DeepSeek 请求失败（${res.status}）${detail ? "：" + detail : ""}`,
    )
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data?.choices?.[0]?.message?.content ?? ""
  if (!content.trim()) throw new DeepSeekError("DeepSeek 没有返回内容。")
  return content
}

/** Remove a wrapping ``` code fence if the model added one. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/)
  return match ? match[1].trim() : trimmed
}
