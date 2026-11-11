import type { ApiOrganization } from "../organizations/organizations"

// LEGACY: the old branding endpoints (/api/screen-preferences). The backend tags them "legado": the
// current branding is in models/branding. Kept typed for completeness.
export type ScreenPreference = {
  displayName: string
  organization: ApiOrganization
  screenPreferenceId: number
  version: number
  favicon?: string
  primaryColor?: string
  secondaryColor?: string
}

// Body of POST /api/screen-preferences: displayName is required (max 100), colors are #RRGGBB. The
// organization, logo and published data are ignored if sent.
export type ScreenPreferenceInput = {
  displayName: string
  favicon?: string
  primaryColor?: string
  secondaryColor?: string
}

// Body of PUT /api/screen-preferences/{id}: the same plus the `version` (428 if missing, 409 if stale).
export type ScreenPreferenceUpdate = ScreenPreferenceInput & {
  version: number
}
