export interface Prompt {
  id: string
  title: string
  content: string
  category_id?: string
  tags: string[]
  favorite: boolean
  created_at: number
  updated_at: number
  last_used_at?: number
}

export interface Category {
  id: string
  name: string
  builtin?: boolean
}

export type PromptInput = Omit<Prompt, "id" | "created_at" | "updated_at" | "last_used_at">

export interface BackupData {
  version: number
  exported_at: string
  prompts: Prompt[]
  categories: Category[]
}

export type LibraryFilter =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "recent" }
  | { type: "category"; id: string }
