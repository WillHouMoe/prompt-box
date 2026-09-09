import { useEffect, useMemo, useRef, useState } from "react"
import { Search, CornerDownLeft, Star } from "lucide-react"
import type { Category, Prompt } from "@/types"
import { filterPrompts, sortByUpdated } from "@/lib/search"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  prompts: Prompt[]
  categories: Category[]
  onSelect: (prompt: Prompt) => void
}

export function CommandPalette({
  open,
  onClose,
  prompts,
  categories,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    const matched = filterPrompts(prompts, query, categories)
    return sortByUpdated(matched).slice(0, 30)
  }, [prompts, query, categories])

  useEffect(() => {
    setIndex((i) => (i >= results.length ? 0 : i))
  }, [results.length])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onClose()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndex((i) => (i + 1) % Math.max(results.length, 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndex((i) => (i - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[index]) {
        onSelect(results[index])
        onClose()
      }
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 p-4 pt-[16vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="animate-scale-in w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3.5">
          <Search size={17} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索 Prompt…"
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
            Esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">没有匹配的 Prompt</p>
          )}
          {results.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p)
                onClose()
              }}
              onMouseEnter={() => setIndex(i)}
              className={cn(
                "focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left",
                i === index ? "bg-indigo-50" : "hover:bg-slate-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-slate-800">{p.title}</span>
                  {p.favorite && <Star size={12} className="shrink-0 fill-amber-500 text-amber-500" />}
                </div>
                <p className="truncate text-xs text-slate-400">{p.content}</p>
              </div>
              {i === index && <CornerDownLeft size={14} className="shrink-0 text-indigo-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
