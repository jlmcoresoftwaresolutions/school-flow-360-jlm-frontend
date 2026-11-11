// A temporary link to a file kept by the backend (a branding logo, an organization's document). It
// expires at `expiresAt` (an ISO date-time, 5 minutes by default): never store it, ask for a new one.
export type OrganizationFileLink = {
  expiresAt: string
  url: string
}
