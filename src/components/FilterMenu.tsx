import { useEffect, useRef, useState } from "react"
import {
  Star,
  Clock,
  LayoutGrid,
  FolderKanban,
  Plus,
  Tag,
  Trash2,
  MessageSquare,
  Terminal,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"
import type { Category, LibraryFilter } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

export interface TagStat {
  name: string
  count: number
}

interface FilterMenuProps {
  categories: Category[]
  tags: TagStat[]
  activeFilter: LibraryFilter
  activeTag: string | null
  onSelect: (filter: LibraryFilter) => void
  onAddCategory: (name: string) => void
  onDeleteCategory: (category: Category) => void
  onToggleTag: (tag: string) => void
  onClearTag: () => void
}

/** 浮层里一整行可点的选项；trailing 用来放「删除分类」这类小按钮。 */
function OptionRow({
  active,
  icon,
  label,
  onClick,
  trailing,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  trailing?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center rounded-md transition-colors",
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <button
        onClick={onClick}
        aria-pressed={active}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1 text-sm"
      >
        <span className="shrink-0">{icon}</span>
        <span className={cn("min-w-0 flex-1 truncate text-left", active && "font-semibold")}>
          {label}
        </span>
      </button>
      {trailing}
    </div>
  )
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {children}
      </span>
      {action}
    </div>
  )
}

/** 浮层里最多平铺这么多标签，再多折叠起来。 */
const TAG_LIMIT = 12

/**
 * 「筛选」入口：搜索框下方右侧的一个小按钮，展开后集中放
 * 导航 / 类型 / 分类 / 标签——侧栏那套东西都收在这里，主页只留给 Prompt。
 */
export function FilterMenu({
  categories,
  tags,
  activeFilter,
  activeTag,
  onSelect,
  onAddCategory,
  onDeleteCategory,
  onToggleTag,
  onClearTag,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
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

  // 收起时把「新建分类」的小表单复位，免得下次打开还挂着半截输入
  useEffect(() => {
    if (!open) {
      setAdding(false)
      setName("")
    }
  }, [open])

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onAddCategory(trimmed)
    setName("")
    setAdding(false)
  }

  // 导航 / 类型 / 分类 是单选，选完顺手收起浮层
  const pick = (filter: LibraryFilter) => {
    onSelect(filter)
    setOpen(false)
  }

  const activeCount = (activeFilter.type === "all" ? 0 : 1) + (activeTag ? 1 : 0)
  const visibleTags = showAllTags ? tags : tags.slice(0, TAG_LIMIT)
  const hiddenTags = tags.length - visibleTags.length

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
          activeCount > 0
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        <SlidersHorizontal size={14} />
        筛选
        {activeCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold tabular-nums text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          size={13}
          className={cn("text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* 手机上贴底弹出（避免浮层超出视口底部），桌面端仍锚在按钮下方 */}
      {open && (
        <div
          role="group"
          aria-label="筛选面板"
          data-testid="filter-panel"
          className="fixed inset-x-3 bottom-3 z-30 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-72 md:max-w-[calc(100vw-2rem)]"
          style={{ maxHeight: "min(80vh, 44rem)" }}
        >
          <SectionLabel>导航</SectionLabel>
          <OptionRow
            active={activeFilter.type === "all"}
            icon={<LayoutGrid size={15} />}
            label="全部"
            onClick={() => pick({ type: "all" })}
          />
          <OptionRow
            active={activeFilter.type === "favorites"}
            icon={<Star size={15} />}
            label="常用"
            onClick={() => pick({ type: "favorites" })}
          />
          <OptionRow
            active={activeFilter.type === "recent"}
            icon={<Clock size={15} />}
            label="最近使用"
            onClick={() => pick({ type: "recent" })}
          />

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <SectionLabel>类型</SectionLabel>
          <OptionRow
            active={activeFilter.type === "target" && activeFilter.target === "chat"}
            icon={<MessageSquare size={15} />}
            label="网页 Chat"
            onClick={() => pick({ type: "target", target: "chat" })}
          />
          <OptionRow
            active={activeFilter.type === "target" && activeFilter.target === "agent"}
            icon={<Terminal size={15} />}
            label="本地 Agent"
            onClick={() => pick({ type: "target", target: "agent" })}
          />

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <SectionLabel
            action={
              <button
                aria-label="新建分类"
                onClick={() => setAdding((v) => !v)}
                className="focus-ring rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Plus size={14} />
              </button>
            }
          >
            分类
          </SectionLabel>

          {adding && (
            <div className="flex items-center gap-1 px-1 pb-1">
              <Input
                autoFocus
                value={name}
                placeholder="分类名称"
                aria-label="分类名称"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                  if (e.key === "Escape") {
                    e.stopPropagation()
                    setAdding(false)
                  }
                }}
                className="h-8"
              />
              <Button variant="primary" size="sm" onClick={submit} aria-label="添加分类">
                <Plus size={14} />
              </Button>
            </div>
          )}

          {categories.length === 0 && (
            <p className="px-2.5 py-1 text-xs text-slate-400">还没有分类，点右上角 ＋ 新建</p>
          )}

          {categories.map((c) => (
            <OptionRow
              key={c.id}
              active={activeFilter.type === "category" && activeFilter.id === c.id}
              icon={<FolderKanban size={15} />}
              label={c.name}
              onClick={() => pick({ type: "category", id: c.id })}
              trailing={
                <button
                  aria-label={`删除分类：${c.name}`}
                  title="删除分类"
                  onClick={() => onDeleteCategory(c)}
                  className="focus-ring mr-1 shrink-0 rounded p-1 text-slate-400 transition-opacity hover:bg-slate-200 hover:text-rose-600 focus-visible:opacity-100 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              }
            />
          ))}

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <SectionLabel
            action={
              activeTag ? (
                <button
                  onClick={onClearTag}
                  className="focus-ring rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  清除
                </button>
              ) : undefined
            }
          >
            标签
          </SectionLabel>

          {tags.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-slate-400">还没有标签</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-1.5 pb-1">
              {visibleTags.map((tag) => {
                const active = activeTag === tag.name
                return (
                  <button
                    key={tag.name}
                    onClick={() => onToggleTag(tag.name)}
                    aria-pressed={active}
                    className={cn(
                      "focus-ring inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors",
                      active
                        ? "border-indigo-200 bg-indigo-50 font-medium text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Tag size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate">{tag.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">{tag.count}</span>
                  </button>
                )
              })}
            </div>
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
