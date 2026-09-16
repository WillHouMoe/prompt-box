import type { Prompt } from "@/types"
import { extractVariables } from "./variables"
import { truncate } from "./utils"

/**
 * Card metrics calibrated against the real rendered cards (see the card in
 * `components/PromptCard.tsx`): line-height 22.75px, 22px pills, p-4 padding.
 */
const LINE_HEIGHT = 23
/** Approximate "width units" that fit on one summary line (CJK glyph ≈ 1). */
const LINE_WIDTH = 25.5
const LATIN_WEIGHT = 0.55
const CJK_START = 0x2e80
const MAX_LINES = 8
/** Padding + title + spacings + meta row + action row. */
const CARD_CHROME = 153
/** Extra row for cards that show their variables. */
const VARIABLE_ROW_HEIGHT = 28
/** Extra row when the meta line (type / category / tags) wraps. */
const META_ROW_HEIGHT = 28
/** Pills that fit on one meta line before it wraps. */
const META_PER_LINE = 5.5

/** Text width in line units; CJK glyphs are full width, latin roughly half. */
function summaryWidth(text: string): number {
  let width = 0
  for (const char of text) {
    width += (char.codePointAt(0) ?? 0) >= CJK_START ? 1 : LATIN_WEIGHT
  }
  return width
}

/**
 * Estimate how tall a card will render, in pixels.
 *
 * Deliberately a cheap heuristic (no layout measurement, no DOM access): it
 * only needs to be accurate enough to keep the masonry columns balanced.
 */
export function estimatePromptHeight(prompt: Prompt): number {
  const summary = truncate(prompt.content, 120)
  const lines = Math.min(Math.max(Math.ceil(summaryWidth(summary) / LINE_WIDTH), 1), MAX_LINES)
  const variableRow = extractVariables(prompt.content).length > 0 ? VARIABLE_ROW_HEIGHT : 0
  const pills = 1 + (prompt.category_id ? 1 : 0) + prompt.tags.length
  const metaRows = Math.max(1, Math.ceil(pills / META_PER_LINE))
  return CARD_CHROME + lines * LINE_HEIGHT + variableRow + (metaRows - 1) * META_ROW_HEIGHT
}

/**
 * Distribute items into columns, always appending to the shortest column.
 *
 * Used for the staggered ("waterfall") card layout: every column flows on its
 * own, so neighbouring cards never have to line up. Left-to-right order is
 * roughly preserved because each item goes to the currently shortest column.
 */
export function splitIntoColumns<T>(
  items: T[],
  columnCount: number,
  measure: (item: T) => number,
): T[][] {
  const count = Math.max(1, Math.floor(columnCount))
  const columns: T[][] = Array.from({ length: count }, () => [])
  if (count === 1) {
    columns[0] = [...items]
    return columns
  }

  const heights = new Array<number>(count).fill(0)
  for (const item of items) {
    let target = 0
    for (let i = 1; i < count; i += 1) {
      if (heights[i] < heights[target]) target = i
    }
    columns[target].push(item)
    heights[target] += measure(item)
  }
  return columns
}
