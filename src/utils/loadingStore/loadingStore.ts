let pendingRequests = 0
const listeners = new Set<() => void>()

const notify = (): void => {
  listeners.forEach((listener) => listener())
}

export const subscribeToLoading = (listener: () => void): (() => void) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export const getIsLoading = (): boolean => pendingRequests > 0

export const startLoading = (): void => {
  pendingRequests += 1
  notify()
}

// Safe to call more times than startLoading (e.g. a request that never got counted) - the
// counter never goes below 0, so the overlay can't get stuck showing forever.
export const stopLoading = (): void => {
  pendingRequests = Math.max(0, pendingRequests - 1)
  notify()
}
