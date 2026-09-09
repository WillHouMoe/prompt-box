import { useRef } from "react"
import { Download, Upload } from "lucide-react"
import type { Category, Prompt } from "@/types"
import { exportBackup, parseBackup } from "@/lib/importExport"
import { useToast } from "@/hooks/useToast"
import { Button } from "./ui/Button"

interface ImportExportProps {
  prompts: Prompt[]
  categories: Category[]
  onImport: (prompts: Prompt[], categories: Category[]) => void
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ImportExport({ prompts, categories, onImport }: ImportExportProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    download("promptbox-backup.json", exportBackup(prompts, categories))
    toast("已导出 promptbox-backup.json")
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    try {
      const result = parseBackup(text)
      if (result.errors.length > 0) {
        toast(`已导入 ${result.prompts.length} 条，${result.errors.length} 条跳过`, "info")
      } else {
        toast(`已导入 ${result.prompts.length} 条 Prompt`)
      }
      onImport(result.prompts, result.categories)
    } catch (err) {
      toast(err instanceof Error ? err.message : "导入失败", "error")
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => handleImport(e.target.files?.[0])}
      />
      <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload size={14} />
        导入
      </Button>
      <Button variant="ghost" size="sm" onClick={handleExport}>
        <Download size={14} />
        导出
      </Button>
    </>
  )
}
