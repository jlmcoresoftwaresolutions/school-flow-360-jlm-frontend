import { act, renderHook, waitFor } from "@testing-library/react"
import { AxiosError, type AxiosResponse } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PublishedBrandingResponse } from "@/models"
import { getPublishedBranding } from "@/services/branding"

import { refreshSchoolBranding, useSchoolBranding } from "./useSchoolBranding"

vi.mock("@/services/branding", () => ({ getPublishedBranding: vi.fn() }))

const published: PublishedBrandingResponse = {
  displayName: "Colégio Horizonte",
  favicon: { expiresAt: "2026-11-24T12:05:00Z", url: "https://files.test/favicon.png" },
  logo: { expiresAt: "2026-11-24T12:05:00Z", url: "https://files.test/logo.png" },
  primaryColor: "#1E40AF",
  publishedAt: "2026-11-24T12:00:00Z",
  secondaryColor: null,
}

const failure = (status: number) =>
  new AxiosError("Refused", String(status), undefined, null, { status } as AxiosResponse)

describe("useSchoolBranding", () => {
  afterEach(async () => {
    vi.mocked(getPublishedBranding).mockRejectedValue(failure(404))
    await refreshSchoolBranding()
    vi.mocked(getPublishedBranding).mockReset()
  })

  it("reads the published identity when used", async () => {
    vi.mocked(getPublishedBranding).mockResolvedValue(published)

    const { result } = renderHook(() => useSchoolBranding())

    await waitFor(() =>
      expect(result.current).toEqual({
        displayName: "Colégio Horizonte",
        faviconUrl: "https://files.test/favicon.png",
        logoUrl: "https://files.test/logo.png",
        primaryColor: "#1E40AF",
        secondaryColor: null,
      }),
    )
    expect(getPublishedBranding).toHaveBeenCalledWith({ showLoading: false })
  })

  it("is null when nothing was published", async () => {
    vi.mocked(getPublishedBranding).mockRejectedValue(failure(404))

    const { result } = renderHook(() => useSchoolBranding())

    await waitFor(() => expect(getPublishedBranding).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })

  it("keeps the last known identity when a reading fails", async () => {
    vi.mocked(getPublishedBranding).mockResolvedValue(published)
    const { result } = renderHook(() => useSchoolBranding())
    await waitFor(() => expect(result.current?.displayName).toBe("Colégio Horizonte"))

    vi.mocked(getPublishedBranding).mockRejectedValue(failure(500))
    await act(() => refreshSchoolBranding())

    expect(result.current?.displayName).toBe("Colégio Horizonte")
  })

  it("updates everyone showing it when read again", async () => {
    vi.mocked(getPublishedBranding).mockResolvedValue(published)
    const { result } = renderHook(() => useSchoolBranding())
    await waitFor(() => expect(result.current?.displayName).toBe("Colégio Horizonte"))

    vi.mocked(getPublishedBranding).mockResolvedValue({ ...published, displayName: "Colégio Aurora" })
    await act(() => refreshSchoolBranding())

    expect(result.current?.displayName).toBe("Colégio Aurora")
  })
})
