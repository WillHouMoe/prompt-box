import type { BackupData, Category, Prompt, PromptInput } from "@/types"
import { sanitizePrompt } from "@/lib/importExport"
import { createSeedCategories, createSeedPrompts } from "./seed"
import { uid } from "@/lib/utils"

const STORAGE_KEY = "promptbox.data.v1"

interface AppState {
  prompts: Prompt[]
  categories: Category[]
}

function defaultState(): AppState {
  return { prompts: createSeedPrompts(), categories: createSeedCategories() }
}

function isBrowser(): boolean {
  return typeof localStorage !== "undefined"
}

export function loadRawState(): AppState {
  if (!isBrowser()) return defaultState()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    // First run: seed demo data AND persist it so subsequent reads are stable.
    const seeded = defaultState()
    saveState(seeded)
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const promptsRaw = Array.isArray(parsed.prompts) ? parsed.prompts : []
    const categoriesRaw = Array.isArray(parsed.categories) ? parsed.categories : []
    const prompts = promptsRaw
      .map((p) => sanitizePrompt(p))
      .filter((p): p is Prompt => p !== null)
    const categories = categoriesRaw
      .filter((c): c is Category => {
        return (
          typeof c === "object" &&
          c !== null &&
          typeof (c as Category).id === "string" &&
          typeof (c as Category).name === "string"
        )
      })
      .map((c) => ({ id: c.id, name: c.name, builtin: c.builtin }))
    return { prompts, categories }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ---- CRUD over prompts -----------------------------------------------------

export function getPrompts(): Prompt[] {
  return loadRawState().prompts
}

export function getPrompt(id: string): Prompt | null {
  return loadRawState().prompts.find((p) => p.id === id) ?? null
}

export function createPrompt(input: PromptInput): Prompt {
  const state = loadRawState()
  const ts = Date.now()
  const prompt: Prompt = {
    ...input,
    id: uid(),
    created_at: ts,
    updated_at: ts,
  }
  state.prompts.push(prompt)
  saveState(state)
  return prompt
}

export function updatePrompt(id: string, patch: Partial<PromptInput>): Prompt | null {
  const state = loadRawState()
  const idx = state.prompts.findIndex((p) => p.id === id)
  if (idx < 0) return null
  state.prompts[idx] = { ...state.prompts[idx], ...patch, updated_at: Date.now() }
  saveState(state)
  return state.prompts[idx]
}

export function deletePrompt(id: string): boolean {
  const state = loadRawState()
  const next = state.prompts.filter((p) => p.id !== id)
  if (next.length === state.prompts.length) return false
  state.prompts = next
  saveState(state)
  return true
}

export function duplicatePrompt(id: string): Prompt | null {
  const state = loadRawState()
  const src = state.prompts.find((p) => p.id === id)
  if (!src) return null
  const ts = Date.now()
  const copy: Prompt = {
    ...structuredClone(src),
    id: uid(),
    title: `${src.title} Copy`,
    favorite: false,
    created_at: ts,
    updated_at: ts,
    last_used_at: undefined,
  }
  state.prompts.push(copy)
  saveState(state)
  return copy
}

export function toggleFavorite(id: string): Prompt | null {
  const state = loadRawState()
  const idx = state.prompts.findIndex((p) => p.id === id)
  if (idx < 0) return null
  state.prompts[idx].favorite = !state.prompts[idx].favorite
  saveState(state)
  return state.prompts[idx]
}

export function markUsed(id: string): Prompt | null {
  const state = loadRawState()
  const idx = state.prompts.findIndex((p) => p.id === id)
  if (idx < 0) return null
  state.prompts[idx].last_used_at = Date.now()
  state.prompts[idx].updated_at = state.prompts[idx].updated_at
  saveState(state)
  return state.prompts[idx]
}

export function getCategories(): Category[] {
  return loadRawState().categories
}

export function addCategory(name: string): Category {
  const state = loadRawState()
  const id = `cat-${uid()}`
  state.categories.push({ id, name })
  saveState(state)
  return { id, name }
}

export function setFavoriteState(id: string, favorite: boolean): Prompt | null {
  const state = loadRawState()
  const idx = state.prompts.findIndex((p) => p.id === id)
  if (idx < 0) return null
  state.prompts[idx].favorite = favorite
  saveState(state)
  return state.prompts[idx]
}

// ---- Import / Export -------------------------------------------------------

export function importBackup(data: BackupData): Prompt[] {
  const state = loadRawState()
  const existingIds = new Set(state.prompts.map((p) => p.id))
  let added = 0
  for (const p of data.prompts) {
    const clean = sanitizePrompt(p)
    if (clean && !existingIds.has(clean.id)) {
      state.prompts.push(clean)
      existingIds.add(clean.id)
      added++
    }
  }
  // Merge categories (avoid duplicates by name/id).
  const catIds = new Set(state.categories.map((c) => c.id))
  for (const c of data.categories) {
    if (c.id && !catIds.has(c.id)) {
      state.categories.push({ id: c.id, name: c.name, builtin: c.builtin })
      catIds.add(c.id)
    }
  }
  saveState(state)
  return data.prompts
}
