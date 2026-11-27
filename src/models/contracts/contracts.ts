// The enrollment contract (backend ContractController, docs/P05_CONTRATO.md slice 3C): the school's
// contract models, the contract generated for an enrollment and the simple electronic acceptance of each
// signer, by an individual link sent by e-mail.

// A model is born a draft, is approved by the Admin with the legal counsel's reference (only one approved
// at a time: approving another retires it) and is retired; an approved one is never edited.
export type ContractTemplateStatus = "APPROVED" | "DRAFT" | "RETIRED"

export type ContractTemplate = {
  // The controlled fields the text may use as {{field}} (no financial field exists yet).
  allowedFields: string[]
  approvedAt: string | null
  body: string
  code: string
  id: number
  legalApprovalRef: string | null
  status: ContractTemplateStatus
  title: string
  version: number
  versionNumber: number
}

// Body of POST /api/contract-templates and PUT /api/contract-templates/{id} (a draft only).
export type ContractTemplateWrite = {
  body: string
  title: string
  version?: number
}

// Body of POST /api/contract-templates/{id}/approve and /retire. Approving needs the reference of the
// legal counsel's approval (who, when, where it is filed), up to 200 characters.
export type ContractTemplateDecision = {
  legalApprovalRef?: string
  version: number
}

// A request of acceptance to a signer. SUPERSEDED: replaced by a resend (its link no longer works).
// `sendResult` FAILED: the e-mail channel didn't take it, and it can be resent.
export type ContractAcceptanceStatus = "ACCEPTED" | "EXPIRED" | "PENDING" | "REVOKED" | "SUPERSEDED"

export type ContractAcceptance = {
  acceptedAt: string | null
  acceptedContractHash: string | null
  acceptedIp: string | null
  email: string | null
  expiresAt: string | null
  id: number
  requestedAt: string | null
  // What this acceptance covers (P06, V46): CONTRACTING (who contracts), PAYER (who assumes the payment) or
  // both, "CONTRACTING,PAYER", when the same person holds the two roles. Frozen with the evidence.
  roles: string | null
  sendResult: "FAILED" | "SENT" | null
  signerId: number
  signerName: string | null
  status: ContractAcceptanceStatus
  version: number
}

// GET /api/enrollments/{id}/contract: the current contract of the enrollment. `outdated`: the class, the
// start date or the signers changed, or a newer model was approved (generate again and ask again; an
// old acceptance is never copied). `missingSigners`: the signers who haven't accepted this exact version.
export type EnrollmentContract = {
  acceptances: ContractAcceptance[]
  body: string
  contentHash: string
  enrollmentId: number
  generatedAt: string
  id: number
  missingSigners: number[]
  outdated: boolean
  templateVersion: number
  title: string
}

// Body of POST /api/enrollments/{id}/contract/acceptances: one signer, or every one still missing.
export type ContractAcceptanceRequest = {
  signerId?: number
}

// GET /api/public/contract-acceptances/{token}: what the signer sees on opening the link (the exact text
// and its hash). Opening is never accepting.
export type ContractPresentation = {
  body: string
  contentHash: string
  expiresAt: string | null
  signerName: string | null
  studentName: string | null
  title: string
  unitName: string | null
}

// Body of POST /api/public/contract-acceptances/{token}/accept: the hash of the version shown and the
// express confirmation.
export type ContractAcceptRequest = {
  confirm: boolean
  contractHash: string
}
