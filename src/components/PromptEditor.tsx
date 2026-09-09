import { useEffect, useMemo, useState } from "react"
import { Star, Save } from "lucide-react"
import type { Category, Prompt, PromptInput } from "@/types"
import { extractVariables } from "@/lib/variables"
import { cn } from "@/lib/utils"
import { Modal } from "./ui/Modal"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"
import { Textarea } from "./ui/Textarea"

const NEW_CATEGORY = "__new__"

interface PromptEditorProps {
  open: boolean
  onClose: () => void
  prompt: Prompt | null
  categories: Category[]
  onSave: (input: PromptInput) => void
  onCreateCategory: (name: string) => Category
}

export function PromptEditor({
  open,
  onClose,
  prompt,
  categories,
  onSave,
  onCreateCategory,
}: PromptEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [tags, setTags] = useState("")
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(prompt?.title ?? "")
    setContent(prompt?.content ?? "")
    setCategoryId(prompt?.category_id ?? "")
    setTags((prompt?.tags ?? []).join(", "))
    setFavorite(prompt?.favorite ?? false)
    setNewCategory("")
  }, [open, prompt])

  const variables = useMemo(() => extractVariables(content), [content])

  const submit = () => {
    let resolvedCategory = categoryId
    if (categoryId === NEW_CATEGORY) {
      const trimmed = newCategory.trim()
      if (trimmed) {
        resolvedCategory = onCreateCategory(trimmed).id
      } else {
        resolvedCategory = ""
      }
    }
    const tagList = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)
    onSave({
      title: title.trim() || "未命名 Prompt",
      content,
      category_id: resolvedCategory || undefined,
      tags: tagList,
      favorite,
    })
  }

  const valid = title.trim().length > 0 && content.trim().length > 0

  return (
    <Modal open={open} onClose={onClose} title={prompt ? "编辑 Prompt" : "新建 Prompt"} size="lg">
      <div className="space-y-5 p-5">
        <div className="space-y-1.5">
          <label htmlFor="p-title" className="text-xs font-semibold text-slate-700">
            标题
          </label>
          <Input
            id="p-title"
            autoFocus
            placeholder="例如：英语作文润色"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="p-content" className="text-xs font-semibold text-slate-700">
              内容
            </label>
            <span className="font-mono text-[11px] text-slate-400">
              {variables.length > 0 ? `${variables.length} 个变量` : "{{变量名}} 可填入变量"}
            </span>
          </div>
          <Textarea
            id="p-content"
            rows={9}
            placeholder={
              "请帮我修改下面的作文：\n\n{{essay}}\n\n（用 {{变量名}} 标记需要每次填写的内容）"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-y font-mono text-[13px]"
          />
          {variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {variables.map((v) => (
                <code
                  key={v}
                  className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-600"
                >
                  {v}
                </code>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="p-category" className="text-xs font-semibold text-slate-700">
              分类
            </label>
            <select
              id="p-category"
              className="focus-ring h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">无分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>＋ 新建分类…</option>
            </select>
            {categoryId === NEW_CATEGORY && (
              <Input
                autoFocus
                placeholder="输入新分类名称"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1.5 h-8"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="p-tags" className="text-xs font-semibold text-slate-700">
              Tags
            </label>
            <Input
              id="p-tags"
              placeholder="英语, 写作, 高考"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">用逗号分隔多个标签</p>
          </div>
        </div>

        <button
          onClick={() => setFavorite((v) => !v)}
          className={cn(
            "focus-ring flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
            favorite
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50",
          )}
        >
          <Star size={16} fill={favorite ? "currentColor" : "none"} />
          加入常用
          <span className={cn("ml-auto", favorite ? "text-amber-500" : "text-slate-400")}>
            {favorite ? "已收藏" : "未收藏"}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
        <Button variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button variant="primary" disabled={!valid} onClick={submit}>
          <Save size={15} />
          保存
        </Button>
      </div>
    </Modal>
  )
}
