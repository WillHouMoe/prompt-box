import { describe, it, expect, vi, afterEach } from "vitest"
import {
  chatWithDeepSeek,
  stripCodeFence,
  buildSystemPrompt,
} from "./deepseek"

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal("fetch", vi.fn(impl as never))
}

const jsonRes = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

describe("stripCodeFence", () => {
  it("removes a wrapping code fence", () => {
    expect(stripCodeFence("```\nhello\n```")).toBe("hello")
    expect(stripCodeFence("```markdown\nhello\n```")).toBe("hello")
  })

  it("keeps plain text untouched", () => {
    expect(stripCodeFence("  hello  ")).toBe("hello")
  })
})

describe("buildSystemPrompt", () => {
  it("mentions variables and includes context", () => {
    const s = buildSystemPrompt({ title: "标题", content: "内容 {{x}}" })
    expect(s).toContain("{{变量名}}")
    expect(s).toContain("标题")
    expect(s).toContain("内容 {{x}}")
  })

  it("works without context", () => {
    expect(buildSystemPrompt({})).toContain("PromptBox")
  })
})

describe("chatWithDeepSeek", () => {
  it("throws when the api key is empty", async () => {
    await expect(chatWithDeepSeek({ apiKey: "  ", messages: [] })).rejects.toThrow(/API Key/)
  })

  it("returns the assistant message on success", async () => {
    stubFetch(() => jsonRes({ choices: [{ message: { content: "生成的 Prompt" } }] }))
    const out = await chatWithDeepSeek({
      apiKey: "sk-test",
      messages: [{ role: "user", content: "hi" }],
    })
    expect(out).toBe("生成的 Prompt")
  })

  it("sends the key as a bearer token to the DeepSeek endpoint", async () => {
    const spy = vi.fn(() => jsonRes({ choices: [{ message: { content: "ok" } }] }))
    vi.stubGlobal("fetch", spy)
    await chatWithDeepSeek({ apiKey: "sk-abc", messages: [] })
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain("api.deepseek.com")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-abc")
  })

  it("maps 401 to a friendly message", async () => {
    stubFetch(() => jsonRes({ error: { message: "invalid key" } }, 401))
    await expect(chatWithDeepSeek({ apiKey: "bad", messages: [] })).rejects.toThrow(/401/)
  })

  it("maps 429 to a friendly message", async () => {
    stubFetch(() => jsonRes({}, 429))
    await expect(chatWithDeepSeek({ apiKey: "k", messages: [] })).rejects.toThrow(/429/)
  })

  it("maps a network failure to a friendly message", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch")
    })
    await expect(chatWithDeepSeek({ apiKey: "k", messages: [] })).rejects.toThrow(/无法连接/)
  })

  it("throws when the response has no content", async () => {
    stubFetch(() => jsonRes({ choices: [] }))
    await expect(chatWithDeepSeek({ apiKey: "k", messages: [] })).rejects.toThrow(/没有返回内容/)
  })
})
