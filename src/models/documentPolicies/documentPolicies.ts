// The document policy of each unit (EPIC 7, backend docs/P06_CONTRATO.md, Fatia A, V45; Lucas's answer 1
// of 26/11/2026): per unit, stage and kind of enrollment, the Admin publishes whether the unit uses the
// catalog of requirements or expressly has no blocking requirement. Nothing published is a pending policy,
// never "nothing is asked": it blocks the confirmation of a transfer and of a re-enrollment. The new
// enrollment (P05) is not changed by it.

// The kind of enrollment a policy is published for (a requirement may also be "ALL"; a policy never is).
export type DocumentPolicyKind = "NEW" | "REENROLLMENT" | "TRANSFER"

// USE_CATALOG: the active requirements of the catalog apply. NO_BLOCKING_REQUIREMENTS: the unit declares it
// has no blocking requirement for the scope.
export type DocumentPolicyMode = "NO_BLOCKING_REQUIREMENTS" | "USE_CATALOG"

// What a scope has today. INCONSISTENT: the published policy no longer agrees with the catalog (a mandatory
// requirement was published after "no blocking requirement", or the catalog lost every requirement of a
// "uses the catalog"), and it blocks until it is published again.
export type DocumentPolicyStateCode = "INCONSISTENT" | "NO_BLOCKING" | "PENDING" | "USE_CATALOG"

// A published (or withdrawn: `active` false, the scope is pending again) policy of a scope.
export type DocumentPolicy = {
  active: boolean
  enrollmentKind: DocumentPolicyKind
  id: number
  mode: DocumentPolicyMode
  note: string | null
  publishedAt: string
  publishedBy: number | null
  stageId: number
  unitId: number
  version: number
}

// GET /api/document-policies/state: the state of one scope, decided by the backend from the policy and the
// catalog of today. `message` is the backend's English text and never shown.
export type DocumentPolicyState = {
  enrollmentKind: DocumentPolicyKind
  message: string
  stageId: number
  state: DocumentPolicyStateCode
  unitId: number
}

// Body of PUT /api/document-policies: publishes or publishes again a scope (`version` required once the
// scope exists, withdrawn included). The note has up to 300 characters.
export type DocumentPolicyWrite = {
  enrollmentKind: DocumentPolicyKind
  mode: DocumentPolicyMode
  note?: string
  stageId: number
  unitId: number
  version?: number
}
