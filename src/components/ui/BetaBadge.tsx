import { cn } from "@/lib/utils"

/** 标记还在打磨中的功能（如 DeepSeek AI 助手）。 */
export function BetaBadge({ className, title }: { className?: string; title?: string }) {
  return (
    <span
      title={title ?? "该功能仍在打磨中，可能随版本调整"}
      className={cn(
        "inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700",
        className,
      )}
    >
      Beta
    </span>
  )
}
