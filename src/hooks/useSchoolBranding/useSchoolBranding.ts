import { useEffect, useSyncExternalStore } from "react"

import type { PublishedBrandingResponse } from "@/models"
import { getPublishedBranding } from "@/services/branding"
import { getErrorStatus } from "@/services/httpClient"

// What the school published as its visual identity, as the app shell uses it.
export type SchoolBranding = {
  displayName: string
  faviconUrl: string | null
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string | null
}

const toSchoolBranding = (published: PublishedBrandingResponse): SchoolBranding => ({
  displayName: published.displayName,
  faviconUrl: published.favicon?.url ?? null,
  logoUrl: published.logo?.url ?? null,
  primaryColor: published.primaryColor,
  secondaryColor: published.secondaryColor,
})

// The identity last read, shared by every component that shows it, in memory only: the image links
// last 5 minutes, so nothing is kept between visits. undefined until it is first read (or while it
// can't be), null when nothing was published (the default look).
let current: SchoolBranding | null | undefined = undefined
// Whether a reading has finished, whatever it gave: a failed first reading leaves the identity unknown
// (undefined, so the colors kept from the last visit stay) but is over, and the shell stops waiting.
let settled = false
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => current

const getSettled = () => settled

// Reads the published identity again (GET .../branding/published, for any signed-in user) and tells
// every component showing it. Nothing published (404) is the default look; a failed reading keeps
// what was known. Called once the identity is published, so the shell changes at once.
export const refreshSchoolBranding = async (): Promise<void> => {
  try {
    current = toSchoolBranding(await getPublishedBranding({ showLoading: false }))
  } catch (error) {
    if (getErrorStatus(error) === 404) current = null
  }
  settled = true
  listeners.forEach((listener) => listener())
}

// The school's published identity for the shell behind the login: its name, logo, favicon and colors.
// Read again whenever a component using it mounts, so the image links are fresh; meanwhile the last
// known one is shown. null means the default SchoolFlow360º look, and undefined that it wasn't read
// yet, so the colors kept from the last visit (restoreSchoolColors) stay until it is.
export const useSchoolBranding = (): SchoolBranding | null | undefined => {
  const branding = useSyncExternalStore(subscribe, getSnapshot, () => undefined)

  useEffect(() => {
    void refreshSchoolBranding()
  }, [])

  return branding
}

// Whether the published identity has been read at least once (or its reading failed): until then the
// shell shows placeholders instead of the product's look, which the school's would replace a moment later.
export const useSchoolBrandingSettled = (): boolean => useSyncExternalStore(subscribe, getSettled, () => false)
