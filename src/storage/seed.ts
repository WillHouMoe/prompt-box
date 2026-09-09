import type { Category, Prompt } from "@/types"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { uid } from "@/lib/utils"

const now = Date.now()

export function createSeedPrompts(): Prompt[] {
  const base = { favorite: false, last_used_at: undefined }
  return [
    {
      ...base,
      id: uid(),
      title: "英语作文润色",
      content:
        "请帮我修改下面的英语作文。\n\n要求：\n1. 保留原意\n2. 修正语法错误\n3. 使用更自然的表达\n4. 给出修改后的完整版本\n\n作文：\n{{essay}}",
      category_id: "writing",
      tags: ["英语", "写作", "高考"],
      created_at: now - 1000 * 60 * 60 * 24 * 3,
      updated_at: now - 1000 * 60 * 60 * 24 * 3,
    },
    {
      ...base,
      id: uid(),
      title: "文章总结",
      content:
        "请用中文总结下面这篇文章。\n\n要求：\n1. 提炼核心观点\n2. 分点列出要点\n3. 字数控制在 200 字以内\n\n文章：\n{{article}}",
      category_id: "study",
      tags: ["阅读", "总结"],
      created_at: now - 1000 * 60 * 60 * 24 * 2,
      updated_at: now - 1000 * 60 * 60 * 24 * 2,
    },
    {
      ...base,
      id: uid(),
      title: "Code Review",
      content:
        "请审查下面的代码。\n\n请关注：\n1. 潜在 bug\n2. 可读性与命名\n3. 性能问题\n4. 安全隐患\n\n重点：{{focus}}\n\n代码：\n{{code}}",
      category_id: "code",
      tags: ["代码", "审查"],
      created_at: now - 1000 * 60 * 60 * 24,
      updated_at: now - 1000 * 60 * 60 * 24,
    },
    {
      ...base,
      id: uid(),
      title: "数学题解析",
      content:
        "请讲解下面这道数学题。\n\n要求：\n1. 给出解题思路\n2. 分步写出推导过程\n3. 最后给出答案\n\n题目：\n{{question}}",
      category_id: "study",
      tags: ["数学"],
      created_at: now - 1000 * 60 * 60 * 5,
      updated_at: now - 1000 * 60 * 60 * 5,
    },
  ]
}

export function createSeedCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c }))
}
