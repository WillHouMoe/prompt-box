import { describe, it, expect, vi, afterEach } from "vitest"
import {
  askAssistant,
  buildSystemPrompt,
  chatEndpoint,
  chatWithDeepSeek,
  DEEPSEEK_MODELS,
  DEEPSEEK_MODEL_LABEL,
  DEFAULT_DEEPSEEK_MODEL,
  DeepSeekError,
  extractJsonObject,
  normalizeDraft,
  parseAssistantReply,
  parsePromptDraft,
  stripCodeFence,
} from "./deepseek"

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal("fetch", vi.fn(impl as never))
}

type FetchSpy = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => unknown>>

/** A typed fetch mock so tests can read the request url/init without casts. */
function spyFetch(impl: (url: string, init?: RequestInit) => unknown): FetchSpy {
  const spy = vi.fn(impl as never) as unknown as FetchSpy
  vi.stubGlobal("fetch", spy)
  return spy
}

const jsonRes = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

const okContent = (content: string) =>
  jsonRes({ choices: [{ message: { reasoning_content: "思考过程", content } }] })

describe("models", () => {
  it("only exposes current DeepSeek models", () => {
    expect(DEEPSEEK_MODELS).toEqual(["deepseek-flash", "deepseek-v4-pro"])
    expect(DEFAULT_DEEPSEEK_MODEL).toBe("deepseek-flash")
    expect(DEEPSEEK_MODELS as readonly string[]).not.toContain("deepseek-chat")
    expect(DEEPSEEK_MODELS as readonly string[]).not.toContain("deepseek-reasoner")
    for (const m of DEEPSEEK_MODELS) expect(DEEPSEEK_MODEL_LABEL[m]).toBeTruthy()
  })
})

describe("chatEndpoint", () => {
  it("appends the completions path to the default base url", () => {
    expect(chatEndpoint()).toBe("https://api.deepseek.com/chat/completions")
    expect(chatEndpoint("https://api.deepseek.com/")).toBe(
      "https://api.deepseek.com/chat/completions",
    )
    expect(chatEndpoint("  https://proxy.example.com/v1  ")).toBe(
      "https://proxy.example.com/v1/chat/completions",
    )
  })
})

describe("stripCodeFence", () => {
  it("removes a wrapping code fence", () => {
    expect(stripCodeFence("```\nhello\n```")).toBe("hello")
    expect(stripCodeFence("```json\nhello\n```")).toBe("hello")
  })

  it("keeps plain text untouched", () => {
    expect(stripCodeFence("  hello  ")).toBe("hello")
  })
})

describe("extractJsonObject", () => {
  it("finds an object surrounded by prose", () => {
    expect(extractJsonObject('好的：{"a": 1} 就这些')).toBe('{"a": 1}')
  })

  it("ignores braces inside strings", () => {
    expect(extractJsonObject('{"content": "用 {{x}} 占位"}')).toBe('{"content": "用 {{x}} 占位"}')
  })

  it("returns null when there is no object", () => {
    expect(extractJsonObject("没有 JSON")).toBeNull()
  })
})

describe("buildSystemPrompt", () => {
  it("states the JSON output contract", () => {
    const s = buildSystemPrompt({})
    expect(s).toContain("PromptBox")
    expect(s).toContain("{{变量名}}")
    expect(s).toContain('"reply"')
    expect(s).toContain('"draft"')
    expect(s).toContain("json")
  })

  it("includes the current prompt context and categories", () => {
    const s = buildSystemPrompt({
      title: "英语作文润色",
      content: "请修改 {{essay}}",
      target: "agent",
      tags: ["英语"],
      category: "学习",
      categoryNames: ["学习", "编程"],
    })
    expect(s).toContain("英语作文润色")
    expect(s).toContain("请修改 {{essay}}")
    expect(s).toContain("agent")
    expect(s).toContain("学习 / 编程")
  })

  it("falls back to the built-in category list", () => {
    expect(buildSystemPrompt({})).toContain("写作")
  })
})

describe("normalizeDraft", () => {
  it("requires content", () => {
    expect(normalizeDraft({ title: "只有标题" })).toBeUndefined()
    expect(normalizeDraft({ content: "   " })).toBeUndefined()
    expect(normalizeDraft(null)).toBeUndefined()
  })

  it("trims fields, dedupes tags and validates target", () => {
    const draft = normalizeDraft({
      title: "  标题  ",
      content: " 正文 {{x}} ",
      tags: [" a ", "a", "b", "c", "d", "e", "f"],
      category: " 学习 ",
      target: "agent",
    })
    expect(draft).toEqual({
      title: "标题",
      content: "正文 {{x}}",
      tags: ["a", "b", "c", "d", "e"],
      category: "学习",
      target: "agent",
    })
  })

  it("drops an unknown target", () => {
    expect(normalizeDraft({ content: "x", target: "sandbox" })?.target).toBeUndefined()
  })
})

describe("parsePromptDraft", () => {
  it("reads a nested draft", () => {
    const draft = parsePromptDraft('```json\n{"reply":"ok","draft":{"content":"c"}}\n```')
    expect(draft).toEqual({ title: undefined, content: "c", tags: [], category: undefined, target: undefined })
  })

  it("reads a flat draft object", () => {
    expect(parsePromptDraft('{"title":"t","content":"c"}')?.title).toBe("t")
  })

  it("returns undefined for non-JSON output", () => {
    expect(parsePromptDraft("这是一段普通文本")).toBeUndefined()
    expect(parsePromptDraft("{不是合法 json")).toBeUndefined()
  })
})

describe("parseAssistantReply", () => {
  it("keeps reply and draft together", () => {
    const out = parseAssistantReply('{"reply":"写好了","draft":{"content":"正文"}}')
    expect(out.reply).toBe("写好了")
    expect(out.draft?.content).toBe("正文")
  })

  it("supplies a default reply when only a draft is returned", () => {
    const out = parseAssistantReply('{"draft":{"content":"正文"}}')
    expect(out.reply).toBeTruthy()
    expect(out.draft?.content).toBe("正文")
  })

  it("falls back to plain text", () => {
    const out = parseAssistantReply("```\n直接回答\n```")
    expect(out).toEqual({ reply: "直接回答" })
  })
})

describe("chatWithDeepSeek", () => {
  it("throws when the api key is empty", async () => {
    await expect(chatWithDeepSeek({ apiKey: "  ", messages: [] })).rejects.toMatchObject({
      code: "missing-key",
    })
  })

  it("returns the assistant message on success", async () => {
    stubFetch(() => okContent("生成的 Prompt"))
    const out = await chatWithDeepSeek({
      apiKey: "sk-test",
      messages: [{ role: "user", content: "hi" }],
    })
    expect(out).toBe("生成的 Prompt")
  })

  it("sends the key to the chat completions endpoint", async () => {
    const spy = spyFetch(() => okContent("ok"))
    await chatWithDeepSeek({ apiKey: "sk-abc", messages: [] })
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.deepseek.com/chat/completions")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-abc")
  })

  it("uses the configured base url", async () => {
    const spy = spyFetch(() => okContent("ok"))
    await chatWithDeepSeek({
      apiKey: "k",
      baseUrl: "https://example.com/v1/",
      messages: [],
    })
    expect(spy.mock.calls[0][0]).toBe("https://example.com/v1/chat/completions")
  })

  it("disables thinking by default and forwards the model", async () => {
    const spy = spyFetch(() => okContent("ok"))
    await chatWithDeepSeek({ apiKey: "k", messages: [] })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe("deepseek-flash")
    expect(body.thinking).toEqual({ type: "disabled" })
    expect(body.reasoning_effort).toBeUndefined()
    expect(body.response_format).toBeUndefined()
  })

  it("enables thinking with a reasoning effort when asked", async () => {
    const spy = spyFetch(() => okContent("ok"))
    await chatWithDeepSeek({
      apiKey: "k",
      model: "deepseek-v4-pro",
      thinking: true,
      messages: [],
    })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe("deepseek-v4-pro")
    expect(body.thinking).toEqual({ type: "enabled" })
    expect(body.reasoning_effort).toBe("high")
  })

  it("asks for JSON output and reserves max_tokens", async () => {
    const spy = spyFetch(() => okContent('{"reply":"ok"}'))
    await chatWithDeepSeek({ apiKey: "k", messages: [], json: true })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.max_tokens).toBe(4096)
  })

  it.each([
    [401, /401/],
    [402, /402/],
    [429, /429/],
    [400, /400/],
    [422, /422/],
    [500, /500/],
    [503, /503/],
  ])("maps %i to a friendly message", async (status, pattern) => {
    stubFetch(() => jsonRes({ error: { message: "boom" } }, status))
    await expect(chatWithDeepSeek({ apiKey: "k", messages: [] })).rejects.toThrow(pattern)
  })

  it("maps a network failure to a friendly message without blaming CORS", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch")
    })
    const err = await chatWithDeepSeek({ apiKey: "k", messages: [] }).catch((e) => e)
    expect(err).toBeInstanceOf(DeepSeekError)
    expect(err.message).toContain("无法连接")
    expect(err.message).not.toContain("CORS")
  })

  it("flags an empty response body", async () => {
    stubFetch(() => jsonRes({ choices: [] }))
    await expect(chatWithDeepSeek({ apiKey: "k", messages: [] })).rejects.toMatchObject({
      code: "empty",
    })
  })
})

describe("askAssistant", () => {
  it("prepends the PromptBox system prompt and asks for JSON", async () => {
    const spy = spyFetch(() => okContent('{"reply":"好了","draft":{"content":"正文 {{x}}"}}'))
    const out = await askAssistant({
      apiKey: "k",
      context: { title: "标题" },
      messages: [{ role: "user", content: "帮我写" }],
    })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0].role).toBe("system")
    expect(body.messages[0].content).toContain("PromptBox")
    expect(body.messages[1]).toEqual({ role: "user", content: "帮我写" })
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(out.reply).toBe("好了")
    expect(out.draft?.content).toBe("正文 {{x}}")
  })

  it("retries without JSON mode when JSON mode returns nothing", async () => {
    const spy = spyFetch(() => okContent("纯文本回答")).mockImplementationOnce(() =>
      jsonRes({ choices: [{ message: { content: "" } }] }),
    )
    const out = await askAssistant({ apiKey: "k", messages: [{ role: "user", content: "hi" }] })
    expect(spy).toHaveBeenCalledTimes(2)
    expect(out).toEqual({ reply: "纯文本回答" })
  })
})
