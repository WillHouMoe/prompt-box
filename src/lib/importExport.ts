import type { BackupData, Category, Prompt } from "@/types"
import { isTarget } from "./targets"

export const BACKUP_VERSION = 1

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isPrompt(v: unknown): v is Prompt {
  if (!isRecord(v)) return false
  if (typeof v.id !== "string") return false
  if (typeof v.title !== "string") return false
  if (typeof v.content !== "string") return false
  if (!Array.isArray(v.tags) || !v.tags.every((t) => typeof t === "string")) return false
  if (typeof v.favorite !== "boolean") return false
  if (typeof v.created_at !== "number") return false
  if (typeof v.updated_at !== "number") return false
  if (v.category_id !== undefined && typeof v.category_id !== "string") return false
  if (v.last_used_at !== undefined && typeof v.last_used_at !== "number") return false
  if (v.target !== undefined && !isTarget(v.target)) return false
  return true
}

function isCategory(v: unknown): v is Category {
  if (!isRecord(v)) return false
  if (typeof v.id !== "string") return false
  if (typeof v.name !== "string") return false
  return true
}

export function sanitizePrompt(raw: unknown): Prompt | null {
  if (!isPrompt(raw)) return null
  return {
    id: raw.id,
    title: raw.title.trim(),
    content: raw.content,
    category_id: raw.category_id,
    tags: raw.tags.map((t) => t.trim()).filter(Boolean),
    favorite: raw.favorite,
    target: isTarget(raw.target) ? raw.target : undefined,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    last_used_at: raw.last_used_at,
  }
}

export function makeBackup(prompts: Prompt[], categories: Category[]): BackupData {
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    prompts,
    categories,
  }
}

export function exportBackup(prompts: Prompt[], categories: Category[]): string {
  return JSON.stringify(makeBackup(prompts, categories), null, 2)
}

export interface ParseResult {
  prompts: Prompt[]
  categories: Category[]
  errors: string[]
}

/**
 * Parse user-uploaded JSON backup. Returns valid prompts + categories, plus
 * a list of human-readable errors for any invalid entries.
 */
export function parseBackup(json: string): ParseResult {
  const errors: string[] = []
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error("无法解析文件：不是有效的 JSON")
  }

  // Support both a wrapped backup object and a bare array of prompts.
  let promptArr: unknown[] = []
  let categories: Category[] = []

  if (Array.isArray(data)) {
    promptArr = data
  } else if (isRecord(data)) {
    if (!Array.isArray(data.prompts) && !Array.isArray(data.categories)) {
      throw new Error("无法识别文件结构：应为 PromptBox 备份 JSON")
    }
    if (Array.isArray(data.prompts)) promptArr = data.prompts
    if (Array.isArray(data.categories)) {
      categories = data.categories.filter((c): c is Category => isCategory(c))
    }
  } else {
    throw new Error("无法识别文件结构：应为 PromptBox 备份 JSON")
  }

  const prompts: Prompt[] = []
  promptArr.forEach((item, idx) => {
    const clean = sanitizePrompt(item)
    if (clean) {
      prompts.push(clean)
    } else {
      errors.push(`第 ${idx + 1} 条 Prompt 格式无效，已跳过`)
    }
  })

  return { prompts, categories, errors }
}
