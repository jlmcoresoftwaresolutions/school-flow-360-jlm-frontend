import type { TransitionEvent } from "react"
import { useLayoutEffect, useRef, useState } from "react"

import { useMediaQuery } from "@/hooks"

// Animates a box's height to follow its content's, for a section that swaps what it shows (reading and
// editing). The box takes the content's measured height, and a CSS transition on `height` does the
// rest. While it animates the box clips its content (`isAnimating`), so nothing spills over the
// sections below; at rest it doesn't, so a select's menu opening inside it is never cut.
//
// A zero height means the content isn't rendered (a hidden tab): the box goes back to its natural
// height then, so showing the tab again doesn't grow the section from nothing. With reduced motion on,
// the box never animates. Without ResizeObserver (jsdom) it just keeps its natural height.
export const useAnimatedHeight = () => {
  const contentRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  const [height, setHeight] = useState<number>()
  const [isAnimating, setIsAnimating] = useState(false)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content || typeof ResizeObserver === "undefined") return

    let lastHeight: number | undefined

    const observer = new ResizeObserver(() => {
      const nextHeight = content.offsetHeight
      if (nextHeight === lastHeight) return

      if (nextHeight === 0) {
        lastHeight = undefined
        setHeight(undefined)
        return
      }

      if (lastHeight !== undefined && !prefersReducedMotion) setIsAnimating(true)
      lastHeight = nextHeight
      setHeight(nextHeight)
    })

    observer.observe(content)

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Only the box's own height transition ends the animation, not one of a field inside it.
  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === "height") setIsAnimating(false)
  }

  return { contentRef, handleTransitionEnd, height, isAnimating }
}
