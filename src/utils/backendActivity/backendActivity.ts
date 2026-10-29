// The backend is hosted, for now, on a Render plan that sleeps after 15 minutes without traffic, and
// its first answer after that can take a minute or more. This remembers when it last answered (any
// response, errors included - an error still means it is awake), so a long wait can be told apart:
// "probably waking up" versus just a slow call. Kept per tab, in memory: a new tab doesn't know.
const asleepAfterIdleMs = 15 * 60 * 1000

let lastResponseAt: number | null = null

export const markBackendResponse = (): void => {
  lastResponseAt = Date.now()
}

export const isBackendLikelyAsleep = (): boolean =>
  lastResponseAt === null || Date.now() - lastResponseAt > asleepAfterIdleMs

// Tests only: forgets every response, back to the state of a freshly opened tab.
export const resetBackendActivity = (): void => {
  lastResponseAt = null
}
