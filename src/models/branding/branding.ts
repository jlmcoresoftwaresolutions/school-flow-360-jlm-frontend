import type { OrganizationFileLink } from "../organizationFiles/organizationFiles"

// The branding the users actually see: what was last published. GET .../branding/published answers
// it for any signed-in user (a 404 means nothing was published: use the default look).
export type PublishedBrandingResponse = {
  displayName: string
  primaryColor: string
  publishedAt: string
  secondaryColor: string | null
  favicon?: OrganizationFileLink | null
  logo?: OrganizationFileLink | null
}

// GET/PUT .../current/branding and the publish, logo and favicon endpoints answer this: the DRAFT plus
// its publication state. When nothing was saved yet (`configured` false) the other fields come empty
// and `version` is null. `hasUnpublishedChanges` says the draft differs from the published copy (enable
// the Publish button). The logo and favicon links are temporary.
export type BrandingResponse = {
  configured: boolean
  hasFavicon: boolean
  hasLogo: boolean
  hasUnpublishedChanges: boolean
  published: boolean
  version: number | null
  displayName?: string | null
  favicon?: OrganizationFileLink | null
  logo?: OrganizationFileLink | null
  primaryColor?: string | null
  publishedBranding?: PublishedBrandingResponse | null
  secondaryColor?: string | null
}

// Body of PUT .../current/branding, which saves the DRAFT (nothing changes for the users until it is
// published). Leave `version` out the first time; after that it is required and must be the one read.
// displayName is required (max 100); colors are #RRGGBB, and null or empty clears one. The logo is not
// sent here (see the logo upload).
export type BrandingRequest = {
  displayName: string
  primaryColor?: string | null
  secondaryColor?: string | null
  version?: number
}

// Body of POST .../current/branding/publish: the draft's `version` the admin saw (409 if it changed).
export type PublishBrandingRequest = {
  version: number
}
