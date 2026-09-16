export type PromptTarget = "chat" | "agent"

export interface Prompt {
  id: string
  title: string
  content: string
  category_id?: string
  tags: string[]
  favorite: boolean
  /** Where the prompt is meant to be used: web chat or a local agent. */
  target?: PromptTarget
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
  | { type: "target"; target: PromptTarget }

export type ChatRole = "system" | "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface AppSettings {
  deepseekApiKey: string
  deepseekModel: string
}
