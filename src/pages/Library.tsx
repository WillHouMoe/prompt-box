import { useMemo } from "react"
import { Search, Plus, X } from "lucide-react"
import type { Category, LibraryFilter, Prompt, PromptTarget } from "@/types"
import { PromptCard } from "@/components/PromptCard"
import { EmptyState } from "@/components/EmptyState"
import { FilterMenu, type TagStat } from "@/components/FilterMenu"
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
  tags: TagStat[]
  activeFilter: LibraryFilter
  activeTag: string | null
  onSelect: (filter: LibraryFilter) => void
  onAddCategory: (name: string) => void
  onDeleteCategory: (category: Category) => void
  onToggleTag: (tag: string) => void
  onClearTag: () => void
  onClearFilter: () => void
  onTagClick: (tag: string) => void
  onCategoryClick: (id: string) => void
  onTargetClick: (target: PromptTarget) => void
  activeTarget?: PromptTarget | null
  query: string
  onQueryChange: (q: string) => void
  onNew: () => void
}

/** 当前筛选条件的小胶囊；点 × 就回到「全部」。 */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 pl-2 pr-0.5 text-xs font-medium text-indigo-700">
      <span className="truncate">{label}</span>
      <button
        aria-label={`清除筛选：${label}`}
        onClick={onRemove}
        className="focus-ring rounded-full p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
      >
        <X size={12} />
      </button>
    </span>
  )
}

export function Library({
  prompts,
  categories,
  tags,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
  onCopy,
  onToggleFavorite,
  activeFilter,
  activeTag,
  onSelect,
  onAddCategory,
  onDeleteCategory,
  onToggleTag,
  onClearTag,
  onClearFilter,
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
  const isWidest = useMediaQuery("(min-width: 1024px)")
  // Staggered ("waterfall") layout: each column flows on its own instead of
  // stretching cards to line up with a neighbour.
  const columnCount = isWidest ? 3 : isWide ? 2 : 1
  const columns = useMemo(
    () => splitIntoColumns(prompts, columnCount, estimatePromptHeight),
    [prompts, columnCount],
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

  const filterChip =
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
            : null

  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-8 md:py-7 lg:max-w-5xl xl:max-w-6xl">
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
              className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        {/* 搜索框下方：左边是当前筛选条件，右边是唯一的筛选入口 */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {filterChip && <FilterChip label={filterChip} onRemove={onClearFilter} />}
            {activeTag && <FilterChip label={`标签「${activeTag}」`} onRemove={onClearTag} />}
            <span className="text-xs text-slate-400">
              {query ? `搜索「${query}」 · ` : ""}
              {prompts.length} 个结果
            </span>
          </div>

          <FilterMenu
            categories={categories}
            tags={tags}
            activeFilter={activeFilter}
            activeTag={activeTag}
            onSelect={onSelect}
            onAddCategory={onAddCategory}
            onDeleteCategory={onDeleteCategory}
            onToggleTag={onToggleTag}
            onClearTag={onClearTag}
          />
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
