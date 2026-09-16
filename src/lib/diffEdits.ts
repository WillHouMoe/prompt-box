/**
 * 「差分修改」模式的合并算法。
 *
 * 编辑长 Prompt 时，让 AI 只返回改动片段（find → replace），由这里合并回原文：
 * 输出量小、速度快，也不会因为输出太长被截断。
 */

export interface PromptEdit {
  /** 从原文里逐字复制的一段文字（必须唯一）；留空表示追加到末尾。 */
  find: string
  /** 替换后的文字。 */
  replace: string
}

export type EditStatus = "applied" | "not-found" | "ambiguous" | "overlap"

export interface EditOutcome {
  edit: PromptEdit
  status: EditStatus
}

export interface MergeResult {
  content: string
  outcomes: EditOutcome[]
  applied: number
  failed: number
}

interface Located {
  index: number
  edit: PromptEdit
  status: EditStatus
  start: number
  end: number
}

const SPACE_CHARS = new Set([" ", "\t", "\n", "\r", "\u3000", "\u00a0", "\f", "\v"])

/**
 * 把连续空白折叠成单个空格，并记录每个字符在原文中的下标，
 * 这样即使 AI 复制时把空行/缩进改了一点点，也还能找到位置。
 */
function normalize(text: string): { norm: string; map: number[] } {
  const chars: string[] = []
  const map: number[] = []
  let prevSpace = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (SPACE_CHARS.has(ch)) {
      if (prevSpace || chars.length === 0) continue
      chars.push(" ")
      map.push(i)
      prevSpace = true
      continue
    }
    chars.push(ch)
    map.push(i)
    prevSpace = false
  }
  if (chars.length > 0 && chars[chars.length - 1] === " ") {
    chars.pop()
    map.pop()
  }
  return { norm: chars.join(""), map }
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) return count
    count += 1
    from = at + 1
  }
}

/** 在原文中定位一段文字；先精确匹配，再退化到忽略空白差异的匹配。 */
export function locateEdit(content: string, find: string): "ok" | "not-found" | "ambiguous" {
  if (!find.trim()) return "not-found"

  const exact = countOccurrences(content, find)
  if (exact === 1) return "ok"
  if (exact > 1) return "ambiguous"

  const { norm } = normalize(content)
  const needle = normalize(find).norm
  if (!needle) return "not-found"
  const loose = countOccurrences(norm, needle)
  if (loose === 1) return "ok"
  if (loose > 1) return "ambiguous"
  return "not-found"
}

function rangeOf(content: string, find: string): { start: number; end: number } | null {
  const at = content.indexOf(find)
  if (at >= 0) return { start: at, end: at + find.length }

  const { norm, map } = normalize(content)
  const needle = normalize(find).norm
  const loose = norm.indexOf(needle)
  if (loose < 0) return null
  const start = map[loose]
  const end = map[loose + needle.length - 1] + 1
  return { start, end }
}

/**
 * 把一批改动合并进原文。
 *
 * 所有改动都先在**原文**里定位（不依赖上一条改动的结果），再按位置从后往前应用，
 * 这样前面的改动不会让后面的定位失效；重叠的改动会被跳过并标记出来。
 */
export function mergeEdits(content: string, edits: PromptEdit[]): MergeResult {
  // outcomes 与传入的 edits 一一对应、顺序一致，方便界面按下标显示每一条的结果。
  const outcomes: EditOutcome[] = edits.map((edit) => ({ edit, status: "not-found" }))
  const located: Located[] = []
  const appends: number[] = []

  edits.forEach((edit, index) => {
    if (!edit.find.trim()) {
      if (edit.replace) appends.push(index)
      // find 为空的条目按「追加到末尾」处理；两段都为空时是空操作。
      outcomes[index] = { edit, status: "applied" }
      return
    }
    const status = locateEdit(content, edit.find)
    if (status !== "ok") {
      outcomes[index] = { edit, status }
      return
    }
    const range = rangeOf(content, edit.find)
    if (!range) {
      outcomes[index] = { edit, status: "not-found" }
      return
    }
    outcomes[index] = { edit, status: "applied" }
    located.push({ index, edit, status: "applied", start: range.start, end: range.end })
  })

  // 重叠检测：按位置排序后，与前一条已接受的改动相交的条目跳过。
  const accepted: Located[] = []
  for (const item of [...located].sort((a, b) => a.start - b.start)) {
    const previous = accepted[accepted.length - 1]
    if (previous && item.start < previous.end) {
      outcomes[item.index] = { edit: item.edit, status: "overlap" }
      continue
    }
    accepted.push(item)
  }

  let next = content
  for (let i = accepted.length - 1; i >= 0; i -= 1) {
    const item = accepted[i]
    next = next.slice(0, item.start) + item.edit.replace + next.slice(item.end)
  }

  for (const index of appends) {
    const trimmed = next.trimEnd()
    next = trimmed.length > 0 ? `${trimmed}\n\n${edits[index].replace}` : edits[index].replace
  }

  const applied = outcomes.filter((o) => o.status === "applied").length
  return { content: next, outcomes, applied, failed: outcomes.length - applied }
}

/** 从 AI 返回的对象里解析改动列表（兼容几种常见字段名）。 */
export function parseEdits(value: unknown): PromptEdit[] {
  if (!Array.isArray(value)) return []
  const edits: PromptEdit[] = []
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    const find = [record.find, record.old, record.search, record.from, record.target].find(
      (v): v is string => typeof v === "string",
    )
    const replace = [record.replace, record.new, record.replacement, record.to, record.content].find(
      (v): v is string => typeof v === "string",
    )
    if (find === undefined && replace === undefined) continue
    const edit = { find: find ?? "", replace: replace ?? "" }
    if (!edit.find && !edit.replace) continue
    if (edit.find === edit.replace) continue
    if (edits.length < 30) edits.push(edit)
  }
  return edits
}
