import type { PromptTarget } from "@/types"

export const TARGETS: PromptTarget[] = ["chat", "agent"]

export const TARGET_LABEL: Record<PromptTarget, string> = {
  chat: "Chat",
  agent: "Agent",
}

export const TARGET_HINT: Record<PromptTarget, string> = {
  chat: "网页端 Chat",
  agent: "本地 Agent",
}

/** Effective target for a prompt: defaults to "chat" when unspecified. */
export function effectiveTarget(prompt: { target?: PromptTarget }): PromptTarget {
  return prompt.target ?? "chat"
}

export function isTarget(value: unknown): value is PromptTarget {
  return value === "chat" || value === "agent"
}

/** Extra text used so searching "agent" / "本地" finds the right prompts. */
export function targetSearchText(target: PromptTarget): string {
  return target === "agent" ? "agent 本地" : "chat 网页"
}
