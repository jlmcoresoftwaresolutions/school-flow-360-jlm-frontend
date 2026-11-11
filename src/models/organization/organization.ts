// The frontend's own shape for Minha Unidade's data. The backend uses other names (orgInstName,
// orgAddressStreet, ...) and lacks some fields (the city, for one), so the service maps between the
// two (the Api* types below are the backend's); what isn't wired yet answers from a mock (see
// services/organization).

// A structured address, shared by the organization and its units. `country` is an ISO 3166-1 alpha-2
// code ("BR"), or empty when it is not known (a unit's is its organization's). The postal code is the
// CEP for a Brazilian address, and `state` its UF; elsewhere both are free text.
export type Address = {
  city: string
  complement: string
  country: string
  district: string
  number: string
  postalCode: string
  state: string
  street: string
}

// The operation-model codes. The backend answers only PRIVATE or PUBLIC, and does not let it be edited;
// the finer codes are the project's own, not reconciled with it yet. Their labels are copy, translated
// by the page.
export type OperationModel = "MIXED" | "PRIVATE" | "PUBLIC" | "PUBLIC_FEDERAL" | "PUBLIC_MUNICIPAL" | "PUBLIC_STATE"

// DP-P1-03 (the organization's status taxonomy) is still open: only these two for now.
export type OrganizationStatus = "ACTIVE" | "INACTIVE"

// The display name is the backend's orgName: how the organization appears in the system.
export type Organization = {
  address: Address
  contactEmail: string
  contactPhone: string
  displayName: string
  id: number
  institutionalName: string
  internalNotes: string
  operationModel: OperationModel
  status: OrganizationStatus
}

// What the organization's edit forms may save, each section sending only its own fields. The operation
// model and the status are not editable on the backend.
export type OrganizationUpdate = Partial<
  Pick<
    Organization,
    "address" | "contactEmail" | "contactPhone" | "displayName" | "institutionalName" | "internalNotes"
  >
>

// The visual identity belongs to the organization in the MVP (no per-unit branding). The logo and
// favicon are image URLs; either may be missing. The name shown with it is the organization's
// displayName.
export type OrganizationBranding = {
  primaryColor: string
  secondaryColor: string
  faviconUrl?: string
  logoUrl?: string
}

// A new logo or favicon comes in as a file; without one the current image is kept (removing it is
// not offered while DP-P1-07 is open).
export type OrganizationBrandingUpdate = {
  primaryColor: string
  secondaryColor: string
  favicon?: File
  logo?: File
}

// DP-P1-04 (the unit's status taxonomy) is still open: only these two for now. Inactivating isn't
// deleting, and there is no reactivation (DP-P1-06).
export type SchoolUnitStatus = "ACTIVE" | "INACTIVE"

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
