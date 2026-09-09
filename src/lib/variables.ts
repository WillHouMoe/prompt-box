/**
 * Extract the unique variable names declared with {{name}} syntax,
 * preserving order of first appearance.
 */
export function extractVariables(content: string): string[] {
  if (!content) return []
  const seen = new Set<string>()
  const regex = /\{\{\s*([\w\-\.]+)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const name = match[1]
    if (name && !seen.has(name)) {
      seen.add(name)
    }
  }
  return Array.from(seen)
}

/**
 * Render the final prompt by replacing every {{name}} occurrence with its value.
 * Missing / empty values are replaced with an empty string.
 */
export function renderPrompt(content: string, values: Record<string, string>): string {
  if (!content) return ""
  return content.replace(/\{\{\s*([\w\-\.]+)\s*\}\}/g, (_full, name: string) => {
    const v = values[name]
    return v == null ? "" : v
  })
}
