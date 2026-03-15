import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // BUG-050: Initialize with safe default to avoid SSR hydration mismatch
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Only update after mount to avoid hydration mismatch
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Set initial value after mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Return false until hydrated (client-side), then return actual value
  return isMobile ?? false
}
