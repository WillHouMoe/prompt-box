import { useCallback, useMemo, useState } from "react"
import { Boxes, Plus, Menu, Command, Settings } from "lucide-react"
import type { Category, LibraryFilter, Prompt, PromptInput, PromptTarget } from "@/types"
import { usePromptStore } from "@/store/promptStore"
import { useHotkeys } from "@/hooks/useHotkeys"
import { useToast } from "@/hooks/useToast"
import { useClipboard } from "@/hooks/useClipboard"
import { useSettings } from "@/hooks/useSettings"
import { extractVariables } from "@/lib/variables"
import { filterByTarget, filterPrompts, sortByRecent, sortByUpdated } from "@/lib/search"
import { Sidebar } from "@/components/Sidebar"
import { Library } from "@/pages/Library"
import { PromptEditor } from "@/components/PromptEditor"
import { UseModal } from "@/components/UseModal"
import { CommandPalette } from "@/components/CommandPalette"
import { ImportExport } from "@/components/ImportExport"
import { SettingsModal } from "@/components/SettingsModal"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Button } from "@/components/ui/Button"

export default function App() {
  const store = usePromptStore()
  const { toast } = useToast()
  const { copy } = useClipboard()
  const { settings, updateSettings } = useSettings()

  const [activeFilter, setActiveFilter] = useState<LibraryFilter>({ type: "all" })
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; prompt: Prompt | null }>({
    open: false,
    prompt: null,
  })
  const [useStateModal, setUseModal] = useState<{ open: boolean; prompt: Prompt | null }>({
    open: false,
    prompt: null,
  })
  const [delState, setDelState] = useState<{ open: boolean; prompt: Prompt | null }>({
    open: false,
    prompt: null,
  })

  const openCreate = useCallback(() => {
    setEditor({ open: true, prompt: null })
  }, [])
  const openEdit = useCallback((p: Prompt) => {
    setEditor({ open: true, prompt: p })
  }, [])
  const openUse = useCallback((p: Prompt) => {
    setUseModal({ open: true, prompt: p })
  }, [])
  const openDelete = useCallback((p: Prompt) => {
    setDelState({ open: true, prompt: p })
  }, [])

  useHotkeys({
    onCommandK: () => setPaletteOpen(true),
    onNew: openCreate,
  })

  const handleSelectFilter = useCallback((f: LibraryFilter) => {
    setActiveFilter(f)
    setActiveTag(null)
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setActiveFilter({ type: "all" })
    setActiveTag(tag)
  }, [])

  const handleCategoryClick = useCallback((id: string) => {
    setActiveFilter({ type: "category", id })
    setActiveTag(null)
  }, [])

  const handleTargetClick = useCallback((target: PromptTarget) => {
    setActiveFilter({ type: "target", target })
    setActiveTag(null)
  }, [])

  const handleToggleFavorite = useCallback(
    (p: Prompt) => {
      store.toggleFavorite(p.id)
      toast(p.favorite ? "已取消收藏" : "已收藏")
    },
    [store, toast],
  )

  const handleDuplicate = useCallback(
    (p: Prompt) => {
      const copyP = store.duplicatePrompt(p.id)
      if (copyP) toast("已复制 Prompt")
    },
    [store, toast],
  )

  const handleCopyFromCard = useCallback(
    async (p: Prompt) => {
      const vars = extractVariables(p.content)
      if (vars.length > 0) {
        toast("该 Prompt 包含变量，请使用后复制", "info")
        openUse(p)
        return
      }
      const ok = await copy(p.content)
      if (ok) {
        store.markUsed(p.id)
        toast("已复制")
      } else {
        toast("复制失败", "error")
      }
    },
    [copy, store, toast, openUse],
  )

  const handleSave = useCallback(
    (input: PromptInput) => {
      if (editor.prompt) {
        store.updatePrompt(editor.prompt.id, input)
        toast("已更新")
      } else {
        store.createPrompt(input)
        toast("已创建")
      }
      setEditor({ open: false, prompt: null })
    },
    [editor.prompt, store, toast],
  )

  const handleConfirmDelete = useCallback(() => {
    if (delState.prompt) {
      store.deletePrompt(delState.prompt.id)
      toast("已删除")
    }
    setDelState({ open: false, prompt: null })
  }, [delState.prompt, store, toast])

  const handleImport = useCallback(
    (prompts: Prompt[], categories: Category[]) => {
      store.importData(prompts, categories)
    },
    [store],
  )

  const filtered = useMemo(() => {
    let list = filterPrompts(store.prompts, query, store.categories)
    if (activeTag) list = list.filter((p) => p.tags.includes(activeTag))
    switch (activeFilter.type) {
      case "favorites":
        list = list.filter((p) => p.favorite)
        break
      case "recent":
        list = sortByRecent(list)
        break
      case "category":
        list = list.filter((p) => p.category_id === activeFilter.id)
        break
      case "target":
        list = filterByTarget(list, activeFilter.target)
        break
      default:
        list = sortByUpdated(list)
    }
    return list
  }, [store.prompts, store.categories, query, activeTag, activeFilter])

  const activeTarget = activeFilter.type === "target" ? activeFilter.target : null

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            aria-label="打开筛选"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
            <Boxes size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">PromptBox</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="设置"
            onClick={() => setSettingsOpen(true)}
            className="text-slate-500"
          >
            <Settings size={17} />
          </Button>
          <ImportExport prompts={store.prompts} categories={store.categories} onImport={handleImport} />
          <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
          <button
            onClick={() => setPaletteOpen(true)}
            className="focus-ring hidden items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-50 sm:flex"
          >
            <Command size={13} />
            搜索
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px]">⌘K</kbd>
          </button>
          <Button variant="primary" size="sm" onClick={openCreate} className="hidden md:inline-flex">
            <Plus size={15} />
            新建
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          categories={store.categories}
          activeFilter={activeFilter}
          activeTag={activeTag}
          onSelect={handleSelectFilter}
          onAddCategory={(name) => store.addCategory(name)}
          onClearTag={() => setActiveTag(null)}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <Library
          prompts={filtered}
          categories={store.categories}
          onUse={openUse}
          onEdit={openEdit}
          onDuplicate={handleDuplicate}
          onDelete={openDelete}
          onCopy={handleCopyFromCard}
          onToggleFavorite={handleToggleFavorite}
          onTagClick={handleTagClick}
          onCategoryClick={handleCategoryClick}
          onTargetClick={handleTargetClick}
          activeFilter={activeFilter}
          activeTarget={activeTarget}
          activeTag={activeTag}
          query={query}
          onQueryChange={setQuery}
          onNew={openCreate}
        />
      </div>

      {/* Modals */}
      <PromptEditor
        open={editor.open}
        onClose={() => setEditor({ open: false, prompt: null })}
        prompt={editor.prompt}
        categories={store.categories}
        settings={settings}
        onSave={handleSave}
        onCreateCategory={(name) => store.addCategory(name)}
        onUpdateSettings={updateSettings}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <UseModal
        open={useStateModal.open}
        onClose={() => setUseModal({ open: false, prompt: null })}
        prompt={useStateModal.prompt}
        onMarkUsed={(id) => store.markUsed(id)}
      />
      <ConfirmDialog
        open={delState.open}
        title="删除 Prompt"
        message={`确定删除「${delState.prompt?.title ?? ""}」吗？此操作无法撤销。`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDelState({ open: false, prompt: null })}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        prompts={store.prompts}
        categories={store.categories}
        onSelect={openUse}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
      />

    </div>
  )
}
