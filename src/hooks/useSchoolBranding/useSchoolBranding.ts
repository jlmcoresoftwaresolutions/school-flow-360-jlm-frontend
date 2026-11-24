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
// last 5 minutes, so nothing is kept between visits. null until it is read, and when nothing was
// published (the default look).
let current: SchoolBranding | null = null
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => current

// Reads the published identity again (GET .../branding/published, for any signed-in user) and tells
// every component showing it. Nothing published (404) is the default look; a failed reading keeps
// what was known. Called once the identity is published, so the shell changes at once.
export const refreshSchoolBranding = async (): Promise<void> => {
  try {
    current = toSchoolBranding(await getPublishedBranding({ showLoading: false }))
  } catch (error) {
    if (getErrorStatus(error) !== 404) return
    current = null
  }
  listeners.forEach((listener) => listener())
}

// The school's published identity for the shell behind the login: its name, logo and favicon (and,
// later, its colors). Read again whenever a component using it mounts, so the image links are fresh;
// meanwhile the last known one is shown. null means the default SchoolFlow360º look.
export const useSchoolBranding = (): SchoolBranding | null => {
  const branding = useSyncExternalStore(subscribe, getSnapshot, () => null)

  useEffect(() => {
    void refreshSchoolBranding()
  }, [])

  return branding
}
