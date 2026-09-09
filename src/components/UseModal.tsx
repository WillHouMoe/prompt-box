import { useEffect, useMemo, useState } from "react"
import { Copy, Check, RotateCcw, Play } from "lucide-react"
import type { Prompt } from "@/types"
import { extractVariables, renderPrompt } from "@/lib/variables"
import { Modal } from "./ui/Modal"
import { Button } from "./ui/Button"
import { VariableForm } from "./VariableForm"
import { MarkdownView } from "./MarkdownView"
import { useClipboard } from "@/hooks/useClipboard"
import { useToast } from "@/hooks/useToast"

interface UseModalProps {
  open: boolean
  onClose: () => void
  prompt: Prompt | null
  onMarkUsed: (id: string) => void
}

export function UseModal({ open, onClose, prompt, onMarkUsed }: UseModalProps) {
  const { toast } = useToast()
  const { copied, copy } = useClipboard()
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && prompt) {
      const vars = extractVariables(prompt.content)
      setValues(Object.fromEntries(vars.map((v) => [v, ""])))
    }
  }, [open, prompt])

  const variables = useMemo(() => (prompt ? extractVariables(prompt.content) : []), [prompt])
  const finalPrompt = useMemo(
    () => (prompt ? renderPrompt(prompt.content, values) : ""),
    [prompt, values],
  )

  if (!prompt) return null

  const handleCopy = async () => {
    const ok = await copy(finalPrompt)
    if (ok) {
      onMarkUsed(prompt.id)
      toast("已复制")
    } else {
      toast("复制失败", "error")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={prompt.title} size="lg">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {/* Left: fill variables */}
        <div className="border-slate-200 p-5 lg:border-r">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              填写变量
            </h3>
            {variables.length > 0 && (
              <button
                onClick={() => setValues(Object.fromEntries(variables.map((v) => [v, ""])))}
                className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-700"
              >
                <RotateCcw size={12} />
                清空
              </button>
            )}
          </div>
          <VariableForm variables={variables} values={values} onChange={setValues} />
        </div>

        {/* Right: preview */}
        <div className="flex flex-col p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Preview
          </h3>
          <div className="max-h-80 flex-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            {finalPrompt ? (
              <MarkdownView content={finalPrompt} />
            ) : (
              <p className="text-sm text-slate-400">填写变量后，这里会实时生成最终 Prompt。</p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">{variables.length} 个变量</span>
            <Button
              variant="primary"
              onClick={handleCopy}
              disabled={finalPrompt.length === 0}
              className="min-w-28"
            >
              <Play size={14} />
              {copied ? (
                <>
                  <Check size={14} />
                  ✓ 已复制
                </>
              ) : (
                <>
                  <Copy size={14} />
                  复制 Prompt
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
