import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useClipboard } from "./useClipboard"

const originalClipboard = window.navigator.clipboard
const originalExec = document.execCommand

beforeEach(() => {
  vi.useFakeTimers()
  // jsdom does not report a secure context, which the hook checks before using
  // the async clipboard API.
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(window.navigator, "clipboard", { value: originalClipboard, configurable: true })
  document.execCommand = originalExec
})

function stubClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(window.navigator, "clipboard", { value: { writeText }, configurable: true })
}

describe("useClipboard", () => {
  it("copies through the async clipboard API", async () => {
    const writeText = vi.fn(async () => {})
    stubClipboard(writeText)
    const { result } = renderHook(() => useClipboard())
    let ok = false
    await act(async () => {
      ok = await result.current.copy("hello")
    })
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith("hello")
    expect(result.current.copied).toBe(true)
  })

  it("falls back to execCommand when the async API rejects", async () => {
    stubClipboard(async () => {
      throw new Error("Document is not focused")
    })
    const exec = vi.fn(() => true)
    document.execCommand = exec as unknown as typeof document.execCommand
    const { result } = renderHook(() => useClipboard())
    let ok = false
    await act(async () => {
      ok = await result.current.copy("hello")
    })
    expect(ok).toBe(true)
    expect(exec).toHaveBeenCalledWith("copy")
    expect(result.current.copied).toBe(true)
  })

  it("resets the copied flag after the timeout", async () => {
    stubClipboard(async () => {})
    const { result } = renderHook(() => useClipboard(100))
    await act(async () => {
      await result.current.copy("hello")
    })
    expect(result.current.copied).toBe(true)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.copied).toBe(false)
  })

  it("reports failure when every path fails", async () => {
    stubClipboard(async () => {
      throw new Error("nope")
    })
    document.execCommand = vi.fn(() => {
      throw new Error("nope")
    }) as unknown as typeof document.execCommand
    const { result } = renderHook(() => useClipboard())
    let ok = true
    await act(async () => {
      ok = await result.current.copy("hello")
    })
    expect(ok).toBe(false)
    expect(result.current.copied).toBe(false)
  })
})
