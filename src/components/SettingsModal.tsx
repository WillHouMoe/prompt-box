import { useEffect, useState } from "react"
import { Eye, EyeOff, KeyRound, Bot, Trash2 } from "lucide-react"
import type { AppSettings } from "@/types"
import { DEEPSEEK_MODELS, DEEPSEEK_MODEL_LABEL } from "@/lib/deepseek"
import { Modal } from "./ui/Modal"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  const [showKey, setShowKey] = useState(false)
  const [keyDraft, setKeyDraft] = useState(settings.deepseekApiKey)

  useEffect(() => {
    if (open) {
      setKeyDraft(settings.deepseekApiKey)
      setShowKey(false)
    }
  }, [open, settings.deepseekApiKey])

  const saveKey = () => {
    onChange({ deepseekApiKey: keyDraft.trim() })
  }

  const clearKey = () => {
    setKeyDraft("")
    onChange({ deepseekApiKey: "" })
  }

  return (
    <Modal open={open} onClose={onClose} title="设置">
      <div className="space-y-5 p-5">
        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Bot size={16} className="mt-0.5 shrink-0 text-indigo-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            接入 DeepSeek 后，新建或编辑 Prompt 时可以用 AI 对话帮你撰写。
            API Key 只保存在本机浏览器（localStorage），不会上传到任何服务器。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-key" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <KeyRound size={13} />
            DeepSeek API Key
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="settings-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                aria-label={showKey ? "隐藏 Key" : "显示 Key"}
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <Button variant="primary" onClick={saveKey}>
              保存
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-600 hover:underline"
            >
              获取 DeepSeek API Key
            </a>
            {settings.deepseekApiKey && (
              <button
                onClick={clearKey}
                className="focus-ring inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600"
              >
                <Trash2 size={12} />
                清除已保存的 Key
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-model" className="text-xs font-semibold text-slate-700">
            模型
          </label>
          <select
            id="settings-model"
            className="focus-ring h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
            value={settings.deepseekModel}
            onChange={(e) => onChange({ deepseekModel: e.target.value })}
          >
            {DEEPSEEK_MODELS.map((m) => (
              <option key={m} value={m}>
                {DEEPSEEK_MODEL_LABEL[m] ?? m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-3.5">
        <Button variant="primary" onClick={onClose}>
          完成
        </Button>
      </div>
    </Modal>
  )
}
