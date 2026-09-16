import { useState } from "react"
import { Star, Clock, LayoutGrid, FolderKanban, Plus, X, Tag, MessageSquare, Terminal } from "lucide-react"
import type { Category, LibraryFilter } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

interface SidebarProps {
  categories: Category[]
  activeFilter: LibraryFilter
  activeTag: string | null
  onSelect: (filter: LibraryFilter) => void
  onAddCategory: (name: string) => void
  onClearTag: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

function NavButton({
  active,
  icon,
  label,
  onClick,
  badge,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-indigo-50 font-semibold text-indigo-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && (
        <span className="text-xs tabular-nums text-slate-400">{badge}</span>
      )}
    </button>
  )
}

export function Sidebar({
  categories,
  activeFilter,
  activeTag,
  onSelect,
  onAddCategory,
  onClearTag,
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
    <div className="flex h-full flex-col gap-1 p-3">
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

      {activeTag && (
        <button
          onClick={onClearTag}
          className="focus-ring mt-1 flex items-center gap-1.5 rounded-md border border-dashed border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700"
        >
          <Tag size={13} />
          筛选：{activeTag}
          <X size={13} className="ml-auto" />
        </button>
      )}

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

      {categories.map((c) => (
        <NavButton
          key={c.id}
          active={activeFilter.type === "category" && activeFilter.id === c.id}
          icon={<FolderKanban size={15} />}
          label={c.name}
          onClick={() => onSelect({ type: "category", id: c.id })}
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
