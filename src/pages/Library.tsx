import { useMemo } from "react"
import { Search, Plus } from "lucide-react"
import type { Category, LibraryFilter, Prompt, PromptTarget } from "@/types"
import { PromptCard } from "@/components/PromptCard"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/Button"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { estimatePromptHeight, splitIntoColumns } from "@/lib/masonry"

export interface CardHandlers {
  onUse: (p: Prompt) => void
  onEdit: (p: Prompt) => void
  onDuplicate: (p: Prompt) => void
  onDelete: (p: Prompt) => void
  onCopy: (p: Prompt) => void
  onToggleFavorite: (p: Prompt) => void
}

interface LibraryProps extends CardHandlers {
  prompts: Prompt[]
  categories: Category[]
  activeFilter: LibraryFilter
  activeTag: string | null
  onTagClick: (tag: string) => void
  onCategoryClick: (id: string) => void
  onTargetClick: (target: PromptTarget) => void
  activeTarget?: PromptTarget | null
  query: string
  onQueryChange: (q: string) => void
  onNew: () => void
}

export function Library({
  prompts,
  categories,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onCopy,
  onToggleFavorite,
  activeFilter,
  activeTag,
  onTagClick,
  onCategoryClick,
  onTargetClick,
  activeTarget,
  query,
  onQueryChange,
  onNew,
}: LibraryProps) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const isWide = useMediaQuery("(min-width: 640px)")
  // Staggered ("waterfall") layout: each column flows on its own instead of
  // stretching cards to line up with a neighbour.
  const columns = useMemo(
    () => splitIntoColumns(prompts, isWide ? 2 : 1, estimatePromptHeight),
    [prompts, isWide],
  )

  const heading =
    activeFilter.type === "favorites"
      ? "常用"
      : activeFilter.type === "recent"
        ? "最近使用"
        : activeFilter.type === "category"
          ? catMap.get(activeFilter.id)?.name ?? "分类"
          : activeFilter.type === "target"
            ? activeFilter.target === "agent"
              ? "本地 Agent"
              : "网页 Chat"
            : "我的 Prompt"

  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-8 md:py-7">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
          <Button variant="primary" size="sm" onClick={onNew} className="md:hidden">
            <Plus size={15} />
            新建
          </Button>
        </div>

        <div className="relative mt-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索 Prompt（标题、内容、分类、标签）…"
            className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400"
            aria-label="搜索 Prompt"
          />
          {query && (
            <button
              aria-label="清除搜索"
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>
            {activeTag ? `标签「${activeTag}」` : ""}
            {activeTag && query ? " · " : ""}
            {query ? `搜索「${query}」` : ""}
            {activeTag || query ? " · " : ""}
            {prompts.length} 个结果
          </span>
        </div>

        {prompts.length === 0 ? (
          <EmptyState filtered={activeTag != null || query.trim().length > 0} onCreate={onNew} />
        ) : (
          <div className="mt-5 flex items-start gap-3">
            {columns.map((column, index) => (
              <div key={index} className="flex min-w-0 flex-1 flex-col gap-3">
                {column.map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p}
                    category={p.category_id ? catMap.get(p.category_id) : undefined}
                    onOpen={onUse}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onCopy={onCopy}
                    onToggleFavorite={onToggleFavorite}
                    onTagClick={onTagClick}
                    onCategoryClick={onCategoryClick}
                    onTargetClick={onTargetClick}
                    activeTag={activeTag}
                    activeTarget={activeTarget}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {prompts.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={onNew}
              className="text-slate-500"
            >
              <Plus size={14} />
              新建 Prompt
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
