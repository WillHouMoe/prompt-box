import type { Category } from "@/types"

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "study", name: "学习", builtin: true },
  { id: "code", name: "编程", builtin: true },
  { id: "writing", name: "写作", builtin: true },
  { id: "work", name: "工作", builtin: true },
  { id: "life", name: "生活", builtin: true },
  { id: "other", name: "其他", builtin: true },
]

export function upsertCategories(
  existing: Category[],
  name: string,
): { categories: Category[]; id: string } {
  const normalized = name.trim()
  const match = existing.find((c) => c.name.toLowerCase() === normalized.toLowerCase())
  if (match) return { categories: existing, id: match.id }
  const next: Category = { id: `cat-${Date.now().toString(36)}`, name: normalized }
  return { categories: [...existing, next], id: next.id }
}
