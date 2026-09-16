/**
 * 「差分修改」模式的合并算法。
 *
 * 编辑长 Prompt 时，让 AI 只返回改动片段（find → replace），由这里合并回原文：
 * 输出量小、速度快，也不会因为输出太长被截断。
 *
 * AI 抄写原文时经常「顺手规范化」：把 `，` 写成 `：`、把 `*` 写成 `-`、
 * 把全角括号写成半角、去掉 `**` 强调……所以定位分三级：
 *   1. 精确匹配；
 *   2. 忽略空行/缩进差异的匹配；
 *   3. 折叠 Markdown 标记与全半角标点后的模糊块匹配（仍然要求唯一）。
 */

export interface PromptEdit {
  /** 从原文里逐字复制的一段文字（必须唯一）；留空表示追加到末尾。 */
  find: string
  /** 替换后的文字。 */
  replace: string
}

export type EditStatus = "applied" | "not-found" | "ambiguous" | "overlap"

/** 这一处改动是靠什么方式定位到的。 */
export type MatchKind = "exact" | "whitespace" | "fuzzy" | "none"

export interface EditOutcome {
  edit: PromptEdit
  status: EditStatus
  /** 定位方式；fuzzy 表示原文里的标点/空行/AI 抄写与原文有细微差异。 */
  match: MatchKind
}

export interface MergeResult {
  content: string
  outcomes: EditOutcome[]
  applied: number
  failed: number
}

const SPACE_CHARS = new Set([" ", "\t", "\n", "\r", "\u3000", "\u00a0", "\f", "\v"])

/** 全角标点 → 半角，让「，」和「,」、「（」和「(」视为同一字符。 */
const PUNCT_FOLD: Record<string, string> = {
  "，": ",",
  "、": ",",
  "。": ".",
  "：": ":",
  "；": ";",
  "！": "!",
  "？": "?",
  "（": "(",
  "）": ")",
  "［": "[",
  "］": "]",
  "｛": "{",
  "｝": "}",
  "《": "<",
  "》": ">",
  "「": '"',
  "」": '"',
  "『": '"',
  "』": '"',
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "—": "-",
  "－": "-",
  "～": "~",
  "·": ".",
}

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

/** 单行折叠：去掉行首 Markdown 记号（# / - / * / 1. / >），再去掉空白与强调标记。 */
function foldLine(line: string): string {
  const body = line.replace(/^\s*(?:[-*+>]\s+|\d+[.)]\s+|#{1,6}\s+)/, "")
  let out = ""
  for (const ch of body) {
    if (SPACE_CHARS.has(ch)) continue
    if (ch === "*" || ch === "_" || ch === "`" || ch === "|") continue
    out += PUNCT_FOLD[ch] ?? ch
  }
  return out
}

/** 整段折叠：换行也一并抹掉，这样「一句话被拆成三行」也能比对上。 */
function fold(text: string): string {
  return text.split("\n").map(foldLine).join("")
}

/** 字符 bigram 的 Dice 相似度（对中文很稳，且是 O(n)）。 */
function dice(a: string, b: string): number {
  if (!a || !b) return a === b ? 1 : 0
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const counts = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i += 1) {
    const key = a.slice(i, i + 2)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let inter = 0
  for (let i = 0; i < b.length - 1; i += 1) {
    const key = b.slice(i, i + 2)
    const left = counts.get(key)
    if (left && left > 0) {
      counts.set(key, left - 1)
      inter += 1
    }
  }
  // Dice = 2 * 交集 / (A 的 bigram 数 + B 的 bigram 数)
  const total = a.length - 1 + (b.length - 1)
  if (total <= 0) return 0
  return (2 * inter) / total
}

/** 模糊匹配的门槛：低于它宁可不动原文（漏改比改错安全）。 */
const FUZZY_MIN_SCORE = 0.72
/** 两个候选位置得分接近到这种程度，就认为无法确定改哪里。 */
const FUZZY_TIE = 0.05
/** 锚点行逐字相同的落点最多尝试多少个（重复段落会命中很多次）。 */
const MAX_EXACT_HITS = 80
/** 锚点只是「长得很像」时的落点上限，按相似度取前几名。 */
const MAX_SOFT_HITS = 24
/** 锚点行本身至少要这么长，否则不做模糊匹配（太短容易误伤）。 */
const MIN_ANCHOR_LENGTH = 6

/** 一个候选匹配块：得分越高越像，anchorExact 表示锚点行是逐字相同的。 */
interface Candidate {
  score: number
  anchorExact: boolean
  start: number
  end: number
}

/** 比较两个候选的可靠程度：先看锚点是否逐字命中，再看相似度。 */
function rank(candidate: Candidate): number {
  return (candidate.anchorExact ? 1 : 0) + candidate.score
}

export interface LocateResult {
  status: "ok" | "not-found" | "ambiguous"
  match: MatchKind
  start: number
  end: number
}

function miss(status: "not-found" | "ambiguous"): LocateResult {
  return { status, match: "none", start: -1, end: -1 }
}

/** 在原文中定位一段文字（精确 → 忽略空白 → 模糊块匹配）。 */
export function locateFind(content: string, find: string): LocateResult {
  if (!find.trim()) return miss("not-found")

  const exact = countOccurrences(content, find)
  if (exact === 1) return { status: "ok", match: "exact", start: content.indexOf(find), end: content.indexOf(find) + find.length }
  if (exact > 1) return miss("ambiguous")

  // 第二级：忽略空行 / 缩进差异
  const { norm, map } = normalize(content)
  const needle = normalize(find).norm
  if (needle) {
    const loose = countOccurrences(norm, needle)
    if (loose === 1) {
      const at = norm.indexOf(needle)
      return {
        status: "ok",
        match: "whitespace",
        start: map[at],
        end: map[at + needle.length - 1] + 1,
      }
    }
    if (loose > 1) return miss("ambiguous")
  }

  return fuzzyLocate(content, find)
}

/**
 * 第三级：折叠掉 Markdown 记号与全半角标点差异后，找最像的一段。
 *
 * 做法是先用 find 里最长的一行当锚点，在正文里找几个候选落点，
 * 再在落点附近枚举「连续几行」的窗口，用 Dice 相似度挑最像的那一块。
 */
function fuzzyLocate(content: string, find: string): LocateResult {
  const foldedFind = fold(find)
  if (foldedFind.length < MIN_ANCHOR_LENGTH) return miss("not-found")

  const lines = content.split("\n")
  const starts: number[] = []
  const ends: number[] = []
  let at = 0
  for (const line of lines) {
    starts.push(at)
    ends.push(at + line.length)
    at += line.length + 1
  }
  const foldedLines = lines.map(foldLine)

  const findLines = find.split("\n")
  let anchorIndex = -1
  let anchorLength = 0
  findLines.forEach((line, index) => {
    const folded = foldLine(line)
    if (folded.length > anchorLength) {
      anchorLength = folded.length
      anchorIndex = index
    }
  })
  if (anchorIndex < 0 || anchorLength < MIN_ANCHOR_LENGTH) return miss("not-found")
  const anchor = foldLine(findLines[anchorIndex])

  const exactHits: number[] = []
  const softHits: Array<{ index: number; score: number }> = []
  for (let i = 0; i < foldedLines.length; i += 1) {
    const candidate = foldedLines[i]
    if (candidate.length < MIN_ANCHOR_LENGTH) continue
    if (candidate === anchor) {
      if (exactHits.length < MAX_EXACT_HITS) exactHits.push(i)
      continue
    }
    // 长度差太多就不必比对了
    if (candidate.length < anchorLength * 0.6 || candidate.length > anchorLength * 1.6) continue
    const score = dice(candidate, anchor)
    if (score >= 0.62) softHits.push({ index: i, score })
  }
  // 有逐字命中的锚点，就只信它们；否则退一步，用最像的几个落点。
  const hits =
    exactHits.length > 0
      ? exactHits
      : softHits
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_SOFT_HITS)
          .map((hit) => hit.index)
  if (hits.length === 0) return miss("not-found")

  const nonEmptyLines = findLines.filter((line) => foldLine(line).length > 0).length
  const minSpan = Math.max(1, nonEmptyLines)

  let best: Candidate | null = null
  const candidates: Candidate[] = []
  for (const hit of hits) {
    // 锚点行逐字相同，比「长得很像」可信得多，优先采信。
    const anchorExact = foldedLines[hit] === anchor
    const base = hit - anchorIndex
    const from = Math.max(0, base - 2)
    const to = Math.min(lines.length - 1, base + 2)
    for (let start = from; start <= to; start += 1) {
      const maxSpan = Math.min(lines.length - start, minSpan + 6)
      for (let span = Math.max(1, minSpan - 2); span <= maxSpan; span += 1) {
        const end = start + span
        if (hit < start || hit >= end) continue
        const block = foldedLines.slice(start, end).join("")
        if (!block) continue
        const score = dice(block, foldedFind)
        if (score < FUZZY_MIN_SCORE) continue
        const candidate = { score, anchorExact, start, end }
        candidates.push(candidate)
        if (!best || rank(candidate) > rank(best)) best = candidate
      }
    }
  }
  if (!best) return miss("not-found")

  // 还有另一处「一样可信」的位置（不重叠）→ 不敢猜。锚点更准的位置不算竞争对手。
  const rivals = candidates.filter(
    (c) =>
      (c.start !== best!.start || c.end !== best!.end) &&
      (c.end <= best!.start || c.start >= best!.end) &&
      rank(c) >= rank(best!) &&
      c.score >= best!.score - FUZZY_TIE,
  )
  if (rivals.length > 0) return miss("ambiguous")

  // 同样可信的窗口里，取最紧凑的那个
  const tightest = candidates
    .filter((c) => rank(c) === rank(best!) && c.score >= best!.score - 0.01)
    .sort((a, b) => a.end - a.start - (b.end - b.start))[0]

  let start = starts[tightest.start]
  let end = ends[tightest.end - 1]
  while (start < end && SPACE_CHARS.has(content[start])) start += 1
  while (end > start && SPACE_CHARS.has(content[end - 1])) end -= 1
  if (start >= end) return miss("not-found")
  return { status: "ok", match: "fuzzy", start, end }
}

/** 只关心「能不能定位到」时用这个。 */
export function locateEdit(content: string, find: string): "ok" | "not-found" | "ambiguous" {
  return locateFind(content, find).status
}

/**
 * 把一批改动合并进原文。
 *
 * 所有改动都先在**原文**里定位（不依赖上一条改动的结果），再按位置从后往前应用，
 * 这样前面的改动不会让后面的定位失效；重叠的改动会被跳过并标记出来。
 */
export function mergeEdits(content: string, edits: PromptEdit[]): MergeResult {
  // outcomes 与传入的 edits 一一对应、顺序一致，方便界面按下标显示每一条的结果。
  const outcomes: EditOutcome[] = edits.map((edit) => ({ edit, status: "not-found", match: "none" }))
  const located: Array<{ index: number; edit: PromptEdit; start: number; end: number }> = []
  const appends: number[] = []

  edits.forEach((edit, index) => {
    if (!edit.find.trim()) {
      if (edit.replace) appends.push(index)
      // find 为空的条目按「追加到末尾」处理；两段都为空时是空操作。
      outcomes[index] = { edit, status: "applied", match: "exact" }
      return
    }
    const found = locateFind(content, edit.find)
    if (found.status !== "ok") {
      outcomes[index] = { edit, status: found.status, match: "none" }
      return
    }
    outcomes[index] = { edit, status: "applied", match: found.match }
    located.push({ index, edit, start: found.start, end: found.end })
  })

  // 重叠检测：按位置排序后，与前一条已接受的改动相交的条目跳过。
  const accepted: typeof located = []
  for (const item of [...located].sort((a, b) => a.start - b.start)) {
    const previous = accepted[accepted.length - 1]
    if (previous && item.start < previous.end) {
      outcomes[item.index] = { edit: item.edit, status: "overlap", match: "none" }
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
