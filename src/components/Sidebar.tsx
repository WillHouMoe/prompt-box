import { useState } from "react"
import {
  Star,
  Clock,
  LayoutGrid,
  FolderKanban,
  Plus,
  X,
  Trash2,
  MessageSquare,
  Terminal,
} from "lucide-react"
import type { Category, LibraryFilter } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

interface SidebarProps {
  categories: Category[]
  activeFilter: LibraryFilter
  onSelect: (filter: LibraryFilter) => void
  onAddCategory: (name: string) => void
  onDeleteCategory: (category: Category) => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

/** 侧栏里一行可点的导航项；trailing 用来放「删除分类」之类的小按钮。 */
function NavButton({
  active,
  icon,
  label,
  onClick,
  badge,
  trailing,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  badge?: number | string
  trailing?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center rounded-md transition-colors",
        active
          ? "bg-indigo-50 font-semibold text-indigo-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <button
        onClick={onClick}
        aria-pressed={active}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm"
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {badge != null && <span className="shrink-0 text-xs tabular-nums text-slate-400">{badge}</span>}
      </button>
      {trailing}
    </div>
  )
}

export function Sidebar({
  categories,
  activeFilter,
  onSelect,
  onAddCategory,
  onDeleteCategory,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onAddCategory(trimmed)
      setName("")
    }
    setAdding(false)
  }

  const content = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">导航</span>
        {onCloseMobile && (
          <button
            aria-label="关闭筛选"
            onClick={onCloseMobile}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <NavButton
        active={activeFilter.type === "favorites"}
        icon={<Star size={16} />}
        label="常用"
        onClick={() => onSelect({ type: "favorites" })}
      />
      <NavButton
        active={activeFilter.type === "recent"}
        icon={<Clock size={16} />}
        label="最近使用"
        onClick={() => onSelect({ type: "recent" })}
      />
      <NavButton
        active={activeFilter.type === "all"}
        icon={<LayoutGrid size={16} />}
        label="全部"
        onClick={() => onSelect({ type: "all" })}
      />

      <div className="mx-1 my-2 border-t border-slate-100" />

      <span className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        类型
      </span>
      <NavButton
        active={activeFilter.type === "target" && activeFilter.target === "chat"}
        icon={<MessageSquare size={15} />}
        label="网页 Chat"
        onClick={() => onSelect({ type: "target", target: "chat" })}
      />
      <NavButton
        active={activeFilter.type === "target" && activeFilter.target === "agent"}
        icon={<Terminal size={15} />}
        label="本地 Agent"
        onClick={() => onSelect({ type: "target", target: "agent" })}
      />

      <div className="mx-1 my-2 border-t border-slate-100" />

      <span className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">分类</span>
        <button
          aria-label="新建分类"
          onClick={() => setAdding((v) => !v)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus size={14} />
        </button>
      </span>

      {adding && (
        <div className="flex items-center gap-1 px-1 pb-1">
          <Input
            autoFocus
            value={name}
            placeholder="分类名称"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit()
              if (e.key === "Escape") setAdding(false)
            }}
            className="h-8"
          />
          <Button variant="primary" size="sm" onClick={submit}>
            <Plus size={14} />
          </Button>
        </div>
      )}

      {categories.length === 0 && (
        <p className="px-2.5 py-1 text-xs text-slate-400">还没有分类，点右上角 ＋ 新建</p>
      )}

      {categories.map((c) => (
        <NavButton
          key={c.id}
          active={activeFilter.type === "category" && activeFilter.id === c.id}
          icon={<FolderKanban size={15} />}
          label={c.name}
          onClick={() => onSelect({ type: "category", id: c.id })}
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
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        {content}
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="animate-scale-in h-full w-64 max-w-[80vw] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  )
}
