import { Inbox, SearchX } from "lucide-react"
import { Button } from "./ui/Button"

interface EmptyStateProps {
  filtered: boolean
  onCreate: () => void
}

export function EmptyState({ filtered, onCreate }: EmptyStateProps) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <SearchX size={22} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">没有找到匹配的 Prompt</p>
        <p className="mt-1 text-sm text-slate-400">试试换一个关键词或清除筛选</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
        <Inbox size={24} className="text-indigo-500" />
      </div>
      <p className="text-base font-semibold text-slate-800">还没有 Prompt</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
        把你经常使用的 Prompt 保存到这里，以后可以快速找到、填写和复制。
      </p>
      <Button variant="primary" className="mt-5" onClick={onCreate}>
        创建第一个 Prompt
      </Button>
    </div>
  )
}
