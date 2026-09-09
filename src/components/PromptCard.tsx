import { memo, useMemo } from "react"
import { Copy, Play, Star, Pencil, Trash2, CopyPlus } from "lucide-react"
import type { Category, Prompt } from "@/types"
import { extractVariables } from "@/lib/variables"
import { cn, truncate } from "@/lib/utils"
import { TagBadge } from "./ui/Badge"

interface PromptCardProps {
  prompt: Prompt
  category?: Category
  onOpen: (p: Prompt) => void
  onEdit: (p: Prompt) => void
  onDuplicate: (p: Prompt) => void
  onDelete: (p: Prompt) => void
  onCopy: (p: Prompt) => void
  onToggleFavorite: (p: Prompt) => void
  onTagClick: (tag: string) => void
  onCategoryClick: (id: string) => void
  activeTag?: string | null
}

function PromptCardInner({
  prompt,
  category,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onCopy,
  onToggleFavorite,
  onTagClick,
  onCategoryClick,
  activeTag,
}: PromptCardProps) {
  const variables = useMemo(() => extractVariables(prompt.content), [prompt.content])
  const summary = useMemo(() => truncate(prompt.content, 120), [prompt.content])

  return (
    <div
      data-testid="prompt-card"
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onOpen(prompt)}
          className="focus-ring -ml-0.5 -mt-0.5 rounded-md px-0.5 text-left text-[15px] font-semibold text-slate-900 hover:text-indigo-600"
        >
          {prompt.title}
        </button>
        <button
          aria-label={prompt.favorite ? "取消收藏" : "收藏"}
          onClick={() => onToggleFavorite(prompt)}
          className={cn(
            "focus-ring rounded-md p-1 transition-colors",
            prompt.favorite
              ? "text-amber-500 hover:text-amber-600"
              : "text-slate-300 hover:text-amber-500",
          )}
        >
          <Star size={16} fill={prompt.favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <button
        onClick={() => onOpen(prompt)}
        className="focus-ring -ml-1 mt-1 cursor-pointer rounded-md px-1 text-left text-sm leading-relaxed text-slate-500"
      >
        {summary}
      </button>

      {variables.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">
            变量 {variables.length}
          </span>
          {variables.slice(0, 4).map((v) => (
            <code key={v} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500">
              {v}
            </code>
          ))}
          {variables.length > 4 && (
            <span className="text-[10px] text-slate-400">+{variables.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {category && (
          <button
            onClick={() => onCategoryClick(prompt.category_id!)}
            className="focus-ring rounded-md px-1.5 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-50"
          >
            {category.name}
          </button>
        )}
        {prompt.tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className="focus-ring rounded-md"
          >
            <TagBadge className={cn(activeTag === tag && "bg-indigo-100 text-indigo-700")}>
              {tag}
            </TagBadge>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
        <button
          onClick={() => onCopy(prompt)}
          className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Copy size={13} />
          复制
        </button>
        <button
          onClick={() => onOpen(prompt)}
          className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Play size={13} />
          使用
        </button>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label="编辑"
            onClick={() => onEdit(prompt)}
            className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label="复制为副本"
            onClick={() => onDuplicate(prompt)}
            className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <CopyPlus size={14} />
          </button>
          <button
            aria-label="删除"
            onClick={() => onDelete(prompt)}
            className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export const PromptCard = memo(PromptCardInner)
