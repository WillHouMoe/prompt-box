import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react"
import type { TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
        className,
      )}
      {...props}
    />
  )
})

interface AutoTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 起始高度（行数）。 */
  minRows?: number
  /** 最多长到几行，超过就内部滚动。 */
  maxRows?: number
}

/**
 * 会自己长高的多行输入框。
 *
 * 变量输入统一用它：内容少的时候只有两三行，粘进来一大段就自动撑开，
 * 长到 maxRows 之后改为内部滚动，不会把弹窗顶爆。
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  function AutoTextarea({ minRows = 2, maxRows = 14, className, value, onChange, ...props }, ref) {
    const inner = useRef<HTMLTextAreaElement | null>(null)
    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement, [])

    const resize = useCallback(() => {
      const el = inner.current
      if (!el) return
      // jsdom 里 scrollHeight 恒为 0，此时交给 rows 决定高度
      if (!el.scrollHeight) {
        el.style.height = ""
        return
      }
      const style = window.getComputedStyle(el)
      const lineHeight = Number.parseFloat(style.lineHeight) || 20
      const box =
        (Number.parseFloat(style.paddingTop) || 0) +
        (Number.parseFloat(style.paddingBottom) || 0) +
        (Number.parseFloat(style.borderTopWidth) || 0) +
        (Number.parseFloat(style.borderBottomWidth) || 0)
      const max = lineHeight * maxRows + box
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, max)}px`
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden"
    }, [maxRows])

    useEffect(() => {
      resize()
    }, [resize, value])

    useEffect(() => {
      const onResize = () => resize()
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }, [resize])

    return (
      <textarea
        ref={inner}
        rows={minRows}
        value={value}
        onChange={(event) => {
          onChange?.(event)
          resize()
        }}
        className={cn(
          "focus-ring w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-900 placeholder:text-slate-400",
          className,
        )}
        {...props}
      />
    )
  },
)
