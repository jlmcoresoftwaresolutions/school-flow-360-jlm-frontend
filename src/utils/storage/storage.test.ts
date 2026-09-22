import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getStorageItem, removeStorageItem, setStorageItem } from "./storage"

// Only the test data keys are cleared between tests, not the whole storage - the encryption key
// this module persists under its own key must survive across tests the same way it survives
// across page loads in the real app, or the last test below (module reload) can't decrypt
// anything a previous test encrypted with the key that was in place at the time.
const testKeys = ["token", "user"]

const clearTestKeys = (): void => {
  testKeys.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

describe("storage", () => {
  beforeEach(clearTestKeys)
  afterEach(clearTestKeys)

  it("round-trips a value through localStorage by default", async () => {
    await setStorageItem("token", "jwt-abc123")

    expect(await getStorageItem("token")).toBe("jwt-abc123")
  })

  it("round-trips an object value", async () => {
    const user = { email: "ana@horizonte.edu.br", role: "diretor" }

    await setStorageItem("user", user)

    expect(await getStorageItem("user")).toEqual(user)
  })

  it("writes to sessionStorage instead of localStorage when area is session", async () => {
    await setStorageItem("token", "jwt-abc123", "session")

    expect(localStorage.getItem("token")).toBeNull()
    expect(sessionStorage.getItem("token")).not.toBeNull()
    expect(await getStorageItem("token", "session")).toBe("jwt-abc123")
  })

  it("never stores the plaintext value in the underlying storage", async () => {
    await setStorageItem("token", "jwt-abc123")

    const raw = localStorage.getItem("token")

    expect(raw).not.toBeNull()
    expect(raw).not.toContain("jwt-abc123")
  })

  it("encrypts the same value differently on every call, since the IV is random", async () => {
    await setStorageItem("token", "jwt-abc123")
    const first = localStorage.getItem("token")

    await setStorageItem("token", "jwt-abc123")
    const second = localStorage.getItem("token")

    expect(first).not.toBe(second)
  })

  it("returns null for a key that was never set", async () => {
    expect(await getStorageItem("missing")).toBeNull()
  })

  it("returns null instead of throwing when the stored value is corrupted", async () => {
    localStorage.setItem("token", "not-a-valid-encrypted-payload")

    expect(await getStorageItem("token")).toBeNull()
  })

  it("removes the item from the given storage area", async () => {
    await setStorageItem("token", "jwt-abc123")
    removeStorageItem("token")

    expect(localStorage.getItem("token")).toBeNull()
    expect(await getStorageItem("token")).toBeNull()
  })

  it("reuses the same persisted encryption key across a fresh module load", async () => {
    await setStorageItem("token", "jwt-abc123")

    vi.resetModules()
    const reloaded = await import("./storage")

    expect(await reloaded.getStorageItem("token")).toBe("jwt-abc123")
  })
})
