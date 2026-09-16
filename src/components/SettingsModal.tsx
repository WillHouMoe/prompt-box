import { useEffect, useState } from "react"
import { Eye, EyeOff, KeyRound, Bot, Trash2, Brain, Sparkles } from "lucide-react"
import type { AppSettings } from "@/types"
import {
  DEEPSEEK_DEFAULT_BASE_URL,
  DEEPSEEK_MODELS,
  DEEPSEEK_MODEL_HINT,
  DEEPSEEK_MODEL_LABEL,
} from "@/lib/deepseek"
import { cn } from "@/lib/utils"
import { Modal } from "./ui/Modal"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"
import { BetaBadge } from "./ui/BetaBadge"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  const [showKey, setShowKey] = useState(false)
  const [keyDraft, setKeyDraft] = useState(settings.deepseekApiKey)
  const [baseDraft, setBaseDraft] = useState(settings.deepseekBaseUrl)

  useEffect(() => {
    if (open) {
      setKeyDraft(settings.deepseekApiKey)
      setBaseDraft(settings.deepseekBaseUrl)
      setShowKey(false)
    }
  }, [open, settings.deepseekApiKey, settings.deepseekBaseUrl])

  const saveKey = () => {
    const next = keyDraft.trim()
    if (next !== settings.deepseekApiKey) onChange({ deepseekApiKey: next })
  }

  const clearKey = () => {
    setKeyDraft("")
    onChange({ deepseekApiKey: "" })
  }

  const commitBaseUrl = () => {
    const next = baseDraft.trim() || DEEPSEEK_DEFAULT_BASE_URL
    onChange({ deepseekBaseUrl: next.replace(/\/+$/, "") })
  }

  return (
    <Modal open={open} onClose={onClose} title="设置">
      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
              <Bot size={16} className="text-indigo-600" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-800">DeepSeek AI 助手</h3>
              <BetaBadge />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            接入后，新建或编辑 Prompt 时可以跟 AI 对话，让它帮你撰写和改写 Prompt。
            API Key 只保存在本机浏览器（localStorage），请求由浏览器直接发往 DeepSeek，不经过任何第三方服务器。
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
                onBlur={saveKey}
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
                {DEEPSEEK_MODEL_LABEL[m] ?? m}（{m}）
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            {DEEPSEEK_MODEL_HINT[settings.deepseekModel] ?? ""}
          </p>
        </div>

        <button
          type="button"
          aria-pressed={settings.deepseekThinking}
          onClick={() => onChange({ deepseekThinking: !settings.deepseekThinking })}
          className={cn(
            "focus-ring flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
            settings.deepseekThinking
              ? "border-indigo-200 bg-indigo-50/60"
              : "border-slate-200 hover:bg-slate-50",
          )}
        >
          <Brain
            size={16}
            className={cn(
              "mt-0.5 shrink-0",
              settings.deepseekThinking ? "text-indigo-600" : "text-slate-400",
            )}
          />
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">深度思考</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  settings.deepseekThinking
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {settings.deepseekThinking ? "已开启" : "已关闭"}
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
              开启后 AI 会先推理再回答，写出的 Prompt 通常更完整，但会慢一些；关掉则更快。
            </span>
          </span>
        </button>

        <details className="rounded-lg border border-slate-200 px-3 py-2.5">
          <summary className="focus-ring cursor-pointer text-xs font-semibold text-slate-600">
            高级：接口地址
          </summary>
          <div className="mt-2.5 space-y-1.5">
            <label htmlFor="settings-base" className="sr-only">
              接口地址
            </label>
            <Input
              id="settings-base"
              value={baseDraft}
              placeholder={DEEPSEEK_DEFAULT_BASE_URL}
              onChange={(e) => setBaseDraft(e.target.value)}
              onBlur={commitBaseUrl}
              className="h-8 font-mono text-xs"
            />
            <p className="flex items-start gap-1 text-[11px] leading-relaxed text-slate-400">
              <Sparkles size={12} className="mt-0.5 shrink-0" />
              默认 {DEEPSEEK_DEFAULT_BASE_URL}，一般不用改。只有用第三方中转服务时才需要修改。
            </p>
          </div>
        </details>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-3.5">
        <Button variant="primary" onClick={onClose}>
          完成
        </Button>
      </div>
    </Modal>
  )
}
