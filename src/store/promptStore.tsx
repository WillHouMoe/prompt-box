import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Category, Prompt, PromptInput } from "@/types"
import * as db from "@/storage/db"

interface StoreValue {
  prompts: Prompt[]
  categories: Category[]
  createPrompt: (input: PromptInput) => Prompt
  updatePrompt: (id: string, patch: Partial<PromptInput>) => Prompt | null
  deletePrompt: (id: string) => boolean
  duplicatePrompt: (id: string) => Prompt | null
  toggleFavorite: (id: string) => Prompt | null
  markUsed: (id: string) => Prompt | null
  addCategory: (name: string) => Category
  importData: (prompts: Prompt[], categories: Category[]) => number
}

const StoreContext = createContext<StoreValue | null>(null)

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    const initial = db.loadRawState()
    return { prompts: initial.prompts, categories: initial.categories }
  })

  const persist = useCallback((next: { prompts: Prompt[]; categories: Category[] }) => {
    setState(next)
    db.saveState(next)
  }, [])

  const createPrompt = useCallback(
    (input: PromptInput): Prompt => {
      const p = db.createPrompt(input)
      const next = db.loadRawState()
      persist(next)
      return p
    },
    [persist],
  )

  const updatePrompt = useCallback(
    (id: string, patch: Partial<PromptInput>): Prompt | null => {
      const p = db.updatePrompt(id, patch)
      const next = db.loadRawState()
      persist(next)
      return p
    },
    [persist],
  )

  const deletePrompt = useCallback(
    (id: string): boolean => {
      const ok = db.deletePrompt(id)
      const next = db.loadRawState()
      persist(next)
      return ok
    },
    [persist],
  )

  const duplicatePrompt = useCallback(
    (id: string): Prompt | null => {
      const p = db.duplicatePrompt(id)
      const next = db.loadRawState()
      persist(next)
      return p
    },
    [persist],
  )

  const toggleFavorite = useCallback(
    (id: string): Prompt | null => {
      const p = db.toggleFavorite(id)
      const next = db.loadRawState()
      persist(next)
      return p
    },
    [persist],
  )

  const markUsed = useCallback(
    (id: string): Prompt | null => {
      const p = db.markUsed(id)
      const next = db.loadRawState()
      persist(next)
      return p
    },
    [persist],
  )

  const addCategory = useCallback(
    (name: string): Category => {
      const c = db.addCategory(name)
      const next = db.loadRawState()
      persist(next)
      return c
    },
    [persist],
  )

  const importData = useCallback(
    (prompts: Prompt[], categories: Category[]): number => {
      db.importBackup({ version: 1, exported_at: "", prompts, categories })
      const next = db.loadRawState()
      persist(next)
      return prompts.length
    },
    [persist],
  )

  const value = useMemo<StoreValue>(
    () => ({
      prompts: state.prompts,
      categories: state.categories,
      createPrompt,
      updatePrompt,
      deletePrompt,
      duplicatePrompt,
      toggleFavorite,
      markUsed,
      addCategory,
      importData,
    }),
    [
      state,
      createPrompt,
      updatePrompt,
      deletePrompt,
      duplicatePrompt,
      toggleFavorite,
      markUsed,
      addCategory,
      importData,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function usePromptStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("usePromptStore must be used within PromptStoreProvider")
  return ctx
}
