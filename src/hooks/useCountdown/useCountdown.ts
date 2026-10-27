import { useEffect, useState } from "react"

export type Countdown = {
  isRunning: boolean
  secondsLeft: number
  start: (seconds: number) => void
}

// A seconds countdown, e.g. to hold back a "send again" button for a while after a send. It tracks
// the end time rather than decrementing a counter, so a tick that fires late (a throttled background
// tab) never makes it run long.
export const useCountdown = (): Countdown => {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (endsAt === null) return

    const interval = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) setEndsAt(null)
    }, 1000)

    return () => clearInterval(interval)
  }, [endsAt])

  const secondsLeft = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))

  const start = (seconds: number) => {
    const current = Date.now()
    setNow(current)
    setEndsAt(current + seconds * 1000)
  }

  return { isRunning: secondsLeft > 0, secondsLeft, start }
}
