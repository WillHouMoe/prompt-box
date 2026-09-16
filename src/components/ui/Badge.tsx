import { cn } from "@/lib/utils"

export function TagBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-md bg-slate-100 px-1.5 text-[11px] font-medium leading-none text-slate-600",
        className,
      )}
    >
      #{children}
    </span>
  )
}
