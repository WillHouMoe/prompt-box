import { useEffect, useState } from "react"

function matches(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return fallback
  return window.matchMedia(query).matches
}

/** Subscribe to a CSS media query (safe in environments without matchMedia). */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query, fallback))

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setIsMatch(event.matches)
    setIsMatch(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query, fallback])

  return isMatch
}
