import type { ApiOrganization } from "../organizations/organizations"

// The backend's school-unit models. The frontend's own shape for a unit (what Minha Unidade works
// with) lives in models/organization.

export type ApiSchoolUnitStatus = "ACTIVE" | "INACTIVE"

// The unit entity nested in other entities (a user's unit), with its address as one text.
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

// A unit's detail, what every unit endpoint answers: the list (each item of its page), by-id, create,
// update, deactivate and activate. `version` is to be kept and sent back when editing, deactivating or
// activating. The address is structured (addressStreet and the others) for a unit saved that way;
// `address` is always there, as one text - composed by the backend from the structured fields, or the
// only address of a unit from before them (whose structured fields come null). `inactivatedAt` and
// `inactivationReason` are set while the unit is INACTIVE and cleared when it is activated again.
export type SchoolUnitDetail = {
  address: string
  addressCep: string | null
  addressCity: string | null
  addressComplement: string | null
  addressDistrict: string | null
  addressNumber: string | null
  addressState: string | null
  addressStreet: string | null
  contactEmail: string
  contactPhone: string
  inactivatedAt: string | null
  inactivationReason: string | null
  operationalStatus: ApiSchoolUnitStatus
  organizationId: number
  schoolUnitId: number
  unitName: string
  unitNotes: string | null
  version: number
}

// Body of POST /api/school-units, trimmed by the backend. unitName (max 100, unique in the tenant
// ignoring case and the spaces around it), contactEmail (a valid e-mail, max 255) and contactPhone (7
// to 25 digits and + ( ) . - space) are required, and so is an address: `addressStreet` (max 150)
// makes it a structured one, the backend composing the single text from the fields; without it the
// single-text `address` (max 500) is taken, as older clients send it; with neither, 400. Limits: CEP
// 20, number 10 (text: letters, digits, / . - and space), complement 100, district 80, city 80, state
// 20, notes 2000. The unit starts ACTIVE.
export type CreateSchoolUnitRequest = {
  contactEmail: string
  contactPhone: string
  unitName: string
  address?: string
  addressCep?: string
  addressCity?: string
  addressComplement?: string
  addressDistrict?: string
  addressNumber?: string
  addressState?: string
  addressStreet?: string
  unitNotes?: string
}

// Body of PUT /api/school-units/{id}: the same fields plus the `version` read from the detail (409
// VERSION_CONFLICT if it is stale, 409 UNIT_NAME_DUPLICATE if the name is taken by another unit).
// Like the create, it replaces every field: one left out is cleared. It does not change the
// organization or the status; for the status use deactivate/activate.
export type UpdateSchoolUnitRequest = CreateSchoolUnitRequest & {
  version: number
}

// Body of POST /api/school-units/{id}/deactivate. `confirmImpacts` must be true when the check said
// the deactivation requires confirmation, otherwise the backend answers 409 IMPACTS_NOT_CONFIRMED.
// `reason` (optional, max 500) is kept in the unit's detail and in the audit.
export type DeactivateSchoolUnitRequest = {
  version: number
  confirmImpacts?: boolean
  reason?: string
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
