import type { ApiSchoolUnitStatus } from "../schoolUnits/schoolUnits"

// The backend's organization models. The frontend's own shape for the same data (what Minha Unidade
// works with) lives in models/organization; this is the API's, with its own names (orgInstName, ...).

export type ApiOrganizationType = "PRIVATE" | "PUBLIC"

export type ApiOrganizationStatus = "ENABLE" | "DISABLE"

// The full organization entity. The backend has no city field and no CNPJ.
export type ApiOrganization = {
  orgAddressCep: string
  orgAddressComplement: string
  orgAddressCountry: string
  orgAddressDistrict: string
  orgAddressNumber: number
  orgAddressState: string
  orgAddressStreet: string
  orgEmail: string
  orgId: number
  orgInstName: string
  orgInstTel: string
  orgName: string
  orgOpType: ApiOrganizationType
  orgStatus: ApiOrganizationStatus
  version: number
}

// Body of POST /api/organizations: the entity without the id and the version, which are ignored. The
// Swagger marks no field as required.
export type CreateOrganizationRequest = Partial<Omit<ApiOrganization, "orgId" | "version">>

// A unit as the organization summary lists it.
export type OrganizationUnitSummary = {
  operationalStatus: ApiSchoolUnitStatus
  schoolUnitId: number
  unitName: string
}

// GET /api/organizations/current/summary: the read-only view for the "my institution" screen. It has
// no `version`.
export type OrganizationSummary = {
  orgEmail: string
  orgId: number
  orgInstName: string
  orgInstTel: string
  orgName: string
  orgOpType: ApiOrganizationType
  orgStatus: ApiOrganizationStatus
  units: OrganizationUnitSummary[]
  unitsCount: number
}

// GET /api/organizations/current/editable (and what the PUTs answer): the fields the edit screen may
// change plus the `version` to send back. orgOpType and orgStatus are for display only.
export type OrganizationEditable = {
  orgAddressCep: string
  orgAddressComplement: string
  orgAddressCountry: string
  orgAddressDistrict: string
  orgAddressNumber: number
  orgAddressState: string
  orgAddressStreet: string
  orgEmail: string
  orgId: number
  orgInstName: string
  orgInstTel: string
  orgName: string
  orgOpType: ApiOrganizationType
  orgStatus: ApiOrganizationStatus
  version: number
}

// Body of PUT /api/organizations/current (and of PUT /api/organizations/{id}). `version` is the one
// read from the editable view: if someone changed the record since, the backend answers 409. Fields
// that are unknown or not editable (orgStatus, orgOpType, orgId...) make it fail with 400, they are
// not ignored. Limits: orgInstName 60, orgName 100, orgEmail 50 (a valid e-mail), orgInstTel 7-25
// characters (digits, + ( ) . - and space, or empty), CEP 20, street 40, complement 70, district 20,
// state 20, country 25.
export type UpdateCurrentOrganizationRequest = {
  version: number
  orgAddressCep?: string
  orgAddressComplement?: string
  orgAddressCountry?: string
  orgAddressDistrict?: string
  orgAddressNumber?: number
  orgAddressState?: string
  orgAddressStreet?: string
  orgEmail?: string
  orgInstName?: string
  orgInstTel?: string
  orgName?: string
}
