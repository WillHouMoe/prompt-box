import { cn } from "@/lib/utils"

export function TagBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600",
        className,
      )}
    >
      #{children}
    </span>
  )
}
