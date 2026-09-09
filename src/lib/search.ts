import type { Category, Prompt } from "@/types"

export interface SearchOptions {
  query?: string
  categories?: Category[]
}

/**
 * Case-insensitive full-text search across title, content, tags and category.
 */
export function filterPrompts(
  prompts: Prompt[],
  query: string,
  categories: Category[] = [],
): Prompt[] {
  const q = query.trim().toLowerCase()
  if (!q) return prompts

  const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]))

  return prompts.filter((p) => {
    const title = p.title.toLowerCase()
    const content = p.content.toLowerCase()
    const tags = p.tags.join(" ").toLowerCase()
    const category = p.category_id ? (catName.get(p.category_id) ?? "") : ""
    return title.includes(q) || content.includes(q) || tags.includes(q) || category.includes(q)
  })
}

export function sortByRecent(prompts: Prompt[]): Prompt[] {
  return [...prompts].sort((a, b) => {
    const at = a.last_used_at ?? a.updated_at
    const bt = b.last_used_at ?? b.updated_at
    return bt - at
  })
}

export function sortByUpdated(prompts: Prompt[]): Prompt[] {
  return [...prompts].sort((a, b) => b.updated_at - a.updated_at)
}
