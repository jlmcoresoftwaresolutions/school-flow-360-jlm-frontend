import type { ApiOrganization } from "../organizations/organizations"

// The backend's school-unit models. The frontend's own shape for a unit (what Minha Unidade works
// with) lives in models/organization.

export type ApiSchoolUnitStatus = "ACTIVE" | "INACTIVE"

// The unit entity, as GET /api/school-units lists it (and POST /api/school-units answers). Its address
// is one free-text string, not a structured address. Whether `organization` is filled in a list item
// is not known yet.
export type ApiSchoolUnit = {
  address: string | null
  contactEmail: string | null
  contactPhone: string | null
  operationalStatus: ApiSchoolUnitStatus
  schoolUnitId: number
  unitName: string
  version: number
  organization?: ApiOrganization
}

// A unit's detail, what the by-id, update, deactivate and activate endpoints answer. `version` is to be
// kept and sent back when editing, deactivating or activating.
export type SchoolUnitDetail = {
  address: string
  contactEmail: string
  contactPhone: string
  operationalStatus: ApiSchoolUnitStatus
  organizationId: number
  schoolUnitId: number
  unitName: string
  version: number
}

// Body of POST /api/school-units: all required, trimmed by the backend. The name must be unique in the
// tenant (ignoring case and the spaces around it); the unit starts ACTIVE. Limits: name 100, address
// 500, e-mail 255 (a valid e-mail), phone 25.
export type CreateSchoolUnitRequest = {
  address: string
  contactEmail: string
  contactPhone: string
  unitName: string
}

// Body of PUT /api/school-units/{id}: the same fields plus the `version` read from the detail (409 if
// it is stale or if the name is taken by another unit). It does not change the organization or the
// status; for the status use deactivate/activate.
export type UpdateSchoolUnitRequest = CreateSchoolUnitRequest & {
  version: number
}

// Body of POST /api/school-units/{id}/deactivate. `confirmImpacts` must be true when the check said
// the deactivation requires confirmation, otherwise the backend answers 409.
export type DeactivateSchoolUnitRequest = {
  version: number
  confirmImpacts?: boolean
}

// Body of POST /api/school-units/{id}/activate.
export type ActivateSchoolUnitRequest = {
  version: number
}

// GET /api/school-units/{id}/deactivation-check: what deactivating would affect, read-only.
// `requiresConfirmation` is true when there are users tied to the unit (they are not changed or
// blocked). `version` is the one to send to deactivate.
export type SchoolUnitDeactivationCheck = {
  assignedUsers: number
  canDeactivate: boolean
  enabledAssignedUsers: number
  operationalStatus: ApiSchoolUnitStatus
  requiresConfirmation: boolean
  schoolUnitId: number
  version: number
}

// GET /api/school-units's query (size 1-100; the sort is stable). The backend also has an
// `organizationId` filter, but it refuses it with 400 (the unit already belongs to the tenant), so it
// is left out.
export type ApiSchoolUnitListParams = {
  direction?: "asc" | "desc"
  page?: number
  search?: string
  size?: number
  sortBy?: "operationalStatus" | "unitName"
  status?: ApiSchoolUnitStatus
}

// GET /api/school-units/consolidated's query: `unitIds` outside the user's authorization are ignored
// without notice.
export type SchoolUnitsConsolidatedParams = {
  status?: ApiSchoolUnitStatus
  unitIds?: number[]
}

export type SchoolUnitConsolidatedTotals = {
  activeUnits: number
  assignedUsers: number
  enabledUsers: number
  inactiveUnits: number
  units: number
}

export type SchoolUnitConsolidatedItem = {
  assignedUsers: number
  enabledUsers: number
  operationalStatus: ApiSchoolUnitStatus
  schoolUnitId: number
  unitName: string
}

// GET /api/school-units/consolidated's `data`. The Swagger documents it as a bare object, so this is
// typed from its description. When `metricsAvailable` is false (e.g. unavailableReason
// "NO_AUTHORIZED_UNITS") `totals` is null: show "unavailable", never 0.
export type SchoolUnitsConsolidated = {
  metricsAvailable: boolean
  totals: SchoolUnitConsolidatedTotals | null
  units: SchoolUnitConsolidatedItem[]
  unavailableReason?: string | null
}
