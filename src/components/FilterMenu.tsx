import { useEffect, useRef, useState } from "react"
import { Tag, SlidersHorizontal, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TagStat {
  name: string
  count: number
}

interface TagFilterProps {
  tags: TagStat[]
  activeTag: string | null
  onToggleTag: (tag: string) => void
  onClearTag: () => void
}

/** 浮层里最多平铺这么多标签，再多折叠起来。 */
const TAG_LIMIT = 12

/**
 * 标签筛选入口：搜索框下方右侧的一个小按钮。
 *
 * 分类和类型属于「去哪找」，留在侧栏；标签数量多且不稳定，挤在侧栏里太琐碎，
 * 所以单独收进这个浮层，点一下就能筛。
 */
export function FilterMenu({ tags, activeTag, onToggleTag, onClearTag }: TagFilterProps) {
  const [open, setOpen] = useState(false)
  const [showAllTags, setShowAllTags] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const visibleTags = showAllTags ? tags : tags.slice(0, TAG_LIMIT)
  const hiddenTags = tags.length - visibleTags.length

  // 选完标签就收起浮层，让结果立刻露出来；取消筛选就点结果行左侧的胶囊
  const pick = (tag: string) => {
    onToggleTag(tag)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="筛选标签"
        className={cn(
          "focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
          activeTag
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        <SlidersHorizontal size={14} />
        筛选
        {activeTag && (
          <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold tabular-nums text-white">
            1
          </span>
        )}
        <ChevronDown
          size={13}
          className={cn("text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* 手机上贴底弹出（避免超出视口底部），桌面端锚在按钮下方 */}
      {open && (
        <div
          role="group"
          aria-label="标签筛选"
          data-testid="tag-filter-panel"
          className="fixed inset-x-3 bottom-3 z-30 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-64 md:max-w-[calc(100vw-2rem)]"
          style={{ maxHeight: "min(80vh, 32rem)" }}
        >
          <div className="flex items-center justify-between px-1.5 pt-1.5 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              标签
            </span>
            {activeTag && (
              <button
                onClick={() => {
                  onClearTag()
                  setOpen(false)
                }}
                className="focus-ring inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={11} />
                清除筛选
              </button>
            )}
          </div>

          {tags.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-slate-400">还没有标签</p>
          ) : (
            visibleTags.map((tag) => {
              const active = activeTag === tag.name
              return (
                <button
                  key={tag.name}
                  onClick={() => pick(tag.name)}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-indigo-50 font-semibold text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Tag size={14} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-left">{tag.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {tag.count}
                  </span>
                </button>
              )
            })
          )}

          {hiddenTags > 0 && (
            <button
              onClick={() => setShowAllTags(true)}
              className="focus-ring mx-1 rounded-md px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              还有 {hiddenTags} 个标签…
            </button>
          )}
          {showAllTags && tags.length > TAG_LIMIT && (
            <button
              onClick={() => setShowAllTags(false)}
              className="focus-ring mx-1 rounded-md px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              收起
            </button>
          )}
        </div>
      )}
    </div>
  )
}
