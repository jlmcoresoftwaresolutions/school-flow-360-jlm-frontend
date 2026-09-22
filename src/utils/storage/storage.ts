// Encrypted wrapper around localStorage/sessionStorage: every value is AES-GCM encrypted before
// it's written, and reading it back always goes through decryption first - nothing is ever put
// into either storage as plain text through this module.
//
// Threat model honesty: the encryption key itself has to live somewhere JS can reach it (see
// loadOrCreateEncryptionKey below), so this does not protect a value from an XSS attacker who can
// execute arbitrary JS in this page - that attacker can call getStorageItem exactly like this
// module does. What it does protect against is anything that reads the raw storage without
// executing JS - poking at devtools/the storage files on disk, a non-JS process or extension
// scanning localStorage, etc. Don't present this as an XSS mitigation to anyone relying on it.
//
// A plain utility module (not a hook) on purpose: the first real consumer of this is going to be
// an axios interceptor in httpClient.ts, which isn't a React component and can't call hooks.

export type StorageArea = "local" | "session"

const algorithmName = "AES-GCM"
const ivLength = 12
const encryptionKeyStorageKey = "__sf360_storage_key__"

const resolveStorage = (area: StorageArea): Storage => (area === "session" ? sessionStorage : localStorage)

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))

// .slice() (rather than returning Uint8Array.from's result directly) guarantees a Uint8Array
// backed by a concrete ArrayBuffer: without it, TS 6's DOM lib types the result as
// Uint8Array<ArrayBufferLike>, which BufferSource (crypto.subtle's own param type) rejects.
const fromBase64 = (base64: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).slice()

// Cached once per page load so every call reuses the same CryptoKey instead of re-importing it
// from storage every time - the key itself always lives in localStorage regardless of which
// StorageArea a given value uses, so a value in sessionStorage can still be decrypted for as long
// as that tab lives, and one in localStorage stays decryptable across reloads.
let cachedKeyPromise: Promise<CryptoKey> | null = null

const loadOrCreateEncryptionKey = async (): Promise<CryptoKey> => {
  const storedKey = localStorage.getItem(encryptionKeyStorageKey)

  if (storedKey) {
    return crypto.subtle.importKey("raw", fromBase64(storedKey), algorithmName, true, ["encrypt", "decrypt"])
  }

  const key = await crypto.subtle.generateKey({ length: 256, name: algorithmName }, true, ["encrypt", "decrypt"])
  const exportedKey = await crypto.subtle.exportKey("raw", key)

  localStorage.setItem(encryptionKeyStorageKey, toBase64(new Uint8Array(exportedKey)))

  return key
}

const getEncryptionKey = (): Promise<CryptoKey> => {
  cachedKeyPromise ??= loadOrCreateEncryptionKey()

  return cachedKeyPromise
}

// Payload shape is base64(iv || ciphertext) - the IV is random per call (AES-GCM requires a
// fresh one every time) and travels alongside the ciphertext since it isn't secret, only unique.
const encryptValue = async (value: string): Promise<string> => {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(ivLength))
  const ciphertext = await crypto.subtle.encrypt({ iv, name: algorithmName }, key, new TextEncoder().encode(value))

  const payload = new Uint8Array(iv.length + ciphertext.byteLength)
  payload.set(iv, 0)
  payload.set(new Uint8Array(ciphertext), iv.length)

  return toBase64(payload)
}

const decryptValue = async (payload: string): Promise<string> => {
  const key = await getEncryptionKey()
  const bytes = fromBase64(payload)
  const iv = bytes.slice(0, ivLength)
  const ciphertext = bytes.slice(ivLength)

  const decrypted = await crypto.subtle.decrypt({ iv, name: algorithmName }, key, ciphertext)

  return new TextDecoder().decode(decrypted)
}

export const setStorageItem = async (key: string, value: unknown, area: StorageArea = "local"): Promise<void> => {
  const encrypted = await encryptValue(JSON.stringify(value))

  resolveStorage(area).setItem(key, encrypted)
}

// Returns null both when the key is missing and when the stored value fails to decrypt/parse
// (tampered, corrupted, or written before this module existed) - reading storage crosses a trust
// boundary (CLAUDE.md: validate at system boundaries), so a caller should never have to catch here.
export const getStorageItem = async <T>(key: string, area: StorageArea = "local"): Promise<T | null> => {
  const raw = resolveStorage(area).getItem(key)
  if (raw === null) return null

  try {
    return JSON.parse(await decryptValue(raw)) as T
  } catch {
    return null
  }
}

export const removeStorageItem = (key: string, area: StorageArea = "local"): void => {
  resolveStorage(area).removeItem(key)
}
