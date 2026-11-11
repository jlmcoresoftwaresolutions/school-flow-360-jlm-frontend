import type { ApiSchoolUnitStatus } from "../schoolUnits/schoolUnits"

// The backend's organization models. The frontend's own shape for the same data (what Minha Unidade
// works with) lives in models/organization; this is the API's, with its own names (orgInstName, ...).

export type ApiOrganizationType = "PRIVATE" | "PUBLIC"

export type ApiOrganizationStatus = "ENABLE" | "DISABLE"

// The full organization entity. The backend has no CNPJ. The address number is text ("123A", "s/n").
export type ApiOrganization = {
  orgAddressCep: string
  orgAddressCity: string
  orgAddressComplement: string
  orgAddressCountry: string
  orgAddressDistrict: string
  orgAddressNumber: string
  orgAddressState: string
  orgAddressStreet: string
  orgEmail: string
  orgId: number
  orgInstName: string
  orgInstTel: string
  orgName: string
  orgNotes: string
  orgOpType: ApiOrganizationType
  orgStatus: ApiOrganizationStatus
  version: number
}

// Body of POST /api/organizations, for when the "current" endpoints answer 404 (no organization yet):
// the same fields as the edit, plus the operation model and the status, which can only be set here
// (orgStatus defaults to ENABLE). The same limits as UpdateCurrentOrganizationRequest; an unknown field
// (orgId, version...) fails with 400. The Swagger marks no field as required.
export type CreateOrganizationRequest = Omit<UpdateCurrentOrganizationRequest, "version"> & {
  orgOpType?: ApiOrganizationType
  orgStatus?: ApiOrganizationStatus
}

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

// GET /api/organizations/current/editable (and what the PUTs and the POST answer): the fields the edit
// screen may change plus the `version` to send back. orgOpType and orgStatus are for display only.
export type OrganizationEditable = {
  orgAddressCep: string
  orgAddressCity: string
  orgAddressComplement: string
  orgAddressCountry: string
  orgAddressDistrict: string
  orgAddressNumber: string
  orgAddressState: string
  orgAddressStreet: string
  orgEmail: string
  orgId: number
  orgInstName: string
  orgInstTel: string
  orgName: string
  orgNotes: string
  orgOpType: ApiOrganizationType
  orgStatus: ApiOrganizationStatus
  version: number
}

// Body of PUT /api/organizations/current (and of PUT /api/organizations/{id}). The backend replaces
// every editable field with the body's value, so a field left out is saved as null: the optional
// marks only mean the backend does not refuse it. `version` is the one read from the editable view: if someone changed the record since, the backend answers 409. Fields
// that are unknown or not editable (orgStatus, orgOpType, orgId...) make it fail with 400, they are
// not ignored. Limits: orgInstName 60, orgName 100, orgEmail 50 (a valid e-mail), orgInstTel 7-25
// characters (digits, + ( ) . - and space, or empty), CEP 20, street 150, number 10 (text: letters,
// digits, / . - and space, e.g. "123A" or "s/n"), complement 100, district 80, city 80, state 20,
// country 25, notes 2000 (free text, line breaks allowed; empty clears it).
export type UpdateCurrentOrganizationRequest = {
  version: number
  orgAddressCep?: string
  orgAddressCity?: string
  orgAddressComplement?: string
  orgAddressCountry?: string
  orgAddressDistrict?: string
  orgAddressNumber?: string
  orgAddressState?: string
  orgAddressStreet?: string
  orgEmail?: string
  orgInstName?: string
  orgInstTel?: string
  orgName?: string
  orgNotes?: string
}
