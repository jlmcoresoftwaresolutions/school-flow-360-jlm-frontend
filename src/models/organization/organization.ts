// The frontend's own shape for Minha Unidade's data. The backend uses other names (orgInstName,
// orgAddressStreet, ...) and lacks some fields (the city, for one), so the service maps between the
// two once it calls the real API; until then it answers from a mock (see services/organization).

// A structured address, shared by the organization and its units.
export type Address = {
  cep: string
  city: string
  complement: string
  district: string
  number: string
  state: string
  street: string
}

// The operation-model codes the project already uses (the backend has only PRIVATE | PUBLIC so far -
// not reconciled yet). Their labels are copy, translated by the page.
export type OperationModel = "MISTA" | "PRIVADA" | "PUBLICA_ESTADUAL" | "PUBLICA_FEDERAL" | "PUBLICA_MUNICIPAL"

// DP-P1-03 (the organization's status taxonomy) is still open: only these two for now.
export type OrganizationStatus = "ATIVA" | "INATIVA"

export type Organization = {
  address: Address
  contactEmail: string
  contactPhone: string
  id: number
  institutionalName: string
  internalNotes: string
  operationModel: OperationModel
  status: OrganizationStatus
}

// What the organization's edit forms change: the status isn't edited there (its taxonomy is pending).
export type OrganizationUpdate = Omit<Organization, "id" | "status">

// The visual identity belongs to the organization in the MVP (no per-unit branding). The logo and
// favicon are image URLs; either may be missing.
export type OrganizationBranding = {
  displayName: string
  primaryColor: string
  secondaryColor: string
  faviconUrl?: string
  logoUrl?: string
}

// A new logo or favicon comes in as a file; without one the current image is kept (removing it is
// not offered while DP-P1-07 is open).
export type OrganizationBrandingUpdate = {
  displayName: string
  primaryColor: string
  secondaryColor: string
  favicon?: File
  logo?: File
}

// DP-P1-04 (the unit's status taxonomy) is still open: only these two for now. Inactivating isn't
// deleting, and there is no reactivation (DP-P1-06).
export type SchoolUnitStatus = "ATIVA" | "INATIVA"

export type SchoolUnit = {
  address: Address
  contactEmail: string
  contactPhone: string
  id: number
  name: string
  notes: string
  status: SchoolUnitStatus
  inactivatedAt?: string
  inactivationReason?: string
}

// What the unit form sends: a new unit always starts active, and it only stops being active by
// inactivation.
export type SchoolUnitInput = Omit<SchoolUnit, "id" | "inactivatedAt" | "inactivationReason" | "status">

export type SchoolUnitInactivation = {
  reason: string
}
