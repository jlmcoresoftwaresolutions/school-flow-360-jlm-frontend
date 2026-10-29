import { getStorageItem, setStorageItem } from "../storage"

// Holds back sign-in attempts after repeated wrong passwords for the same e-mail: every 5th wrong
// attempt locks it, for 1 minute the first time and 3 minutes every time after that. A successful
// sign-in clears the count.
//
// This is a usability barrier, not a security control: it lives in this browser (encrypted
// localStorage, see utils/storage), so clearing site data, another browser or calling the API
// directly gets around it. Protection against password guessing has to be enforced by the backend.
export const failedAttemptsPerLock = 5

const minuteMs = 60 * 1000
const firstLockMs = minuteMs
const laterLockMs = 3 * minuteMs

const loginThrottleStorageKey = "sf360.loginThrottle"

type FailedLoginRecord = {
  failures: number
  lockedUntil: number | null
}

type FailedLoginRecords = Record<string, FailedLoginRecord>

// The lock that starts after this many wrong attempts in a row, or 0 when it isn't a lock point.
export const getLockDurationMs = (failures: number): number => {
  if (failures <= 0 || failures % failedAttemptsPerLock !== 0) return 0

  return failures === failedAttemptsPerLock ? firstLockMs : laterLockMs
}

// The same address however it was typed ("Diretor@Escola.com " and "diretor@escola.com").
export const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const readRecords = async (): Promise<FailedLoginRecords> =>
  (await getStorageItem<FailedLoginRecords>(loginThrottleStorageKey)) ?? {}

// How long (ms) sign-in stays locked for this e-mail, 0 when it isn't.
export const getLoginLockRemainingMs = async (email: string): Promise<number> => {
  const record = (await readRecords())[normalizeEmail(email)]

  return Math.max(0, (record?.lockedUntil ?? 0) - Date.now())
}

// Counts a wrong password for this e-mail and returns the lock (ms) it starts, or 0 when this one
// doesn't reach the next lock point.
export const registerFailedLogin = async (email: string): Promise<number> => {
  const records = await readRecords()
  const key = normalizeEmail(email)

  const failures = (records[key]?.failures ?? 0) + 1
  const lockMs = getLockDurationMs(failures)

  records[key] = { failures, lockedUntil: lockMs > 0 ? Date.now() + lockMs : null }
  await setStorageItem(loginThrottleStorageKey, records)

  return lockMs
}

// Forgets the wrong attempts of this e-mail, after it signs in.
export const clearFailedLogins = async (email: string): Promise<void> => {
  const records = await readRecords()
  const key = normalizeEmail(email)

  if (!(key in records)) return

  delete records[key]
  await setStorageItem(loginThrottleStorageKey, records)
}
