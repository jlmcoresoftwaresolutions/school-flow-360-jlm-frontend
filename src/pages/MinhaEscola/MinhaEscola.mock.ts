// Local mock, standing in for the future @/models/organization + @/services/organization pair
// (see ENB-0004 / ORG-US-001 in the P1-P3 backlog) once /api/v1/organization/current exists.
// Kept inside this page folder rather than under src/models or src/services so it's obvious this
// is provisional and not the real service/model contract.
export type OrganizationBranding = {
  faviconFileName: string
  logoFileName: string
  primaryColor: string
  secondaryColor: string
}

export type OrganizationDetails = {
  address: string
  contactEmail: string
  contactPhone: string
  displayName: string
  internalNotes: string
  legalName: string
  operationModel: string
  status: string
}

export type Organization = OrganizationDetails & {
  branding: OrganizationBranding
}

// Order matches the private/public operation-model field already used across the project
// (see erp-vision-scope memory) - not itself a stand-in for DP-02, which is about which fields
// are mandatory, not this list of values.
// Only the values live here; their labels are copy, translated by the page (minhaEscola.operationModels).
export const operationModelValues = [
  "PRIVADA",
  "PUBLICA_MUNICIPAL",
  "PUBLICA_ESTADUAL",
  "PUBLICA_FEDERAL",
  "MISTA",
] as const

export type OperationModel = (typeof operationModelValues)[number]

// DP-03 (final status taxonomy for Organização/Unidade) is still open - this two-value set is
// only good enough to demo the screen, not a proposal for the real taxonomy.
// Labels translated by the page (minhaEscola.statuses).
export const statusValues = ["ATIVA", "INATIVA"] as const

export type OrganizationStatus = (typeof statusValues)[number]

export const mockOrganization: Organization = {
  address: "Av. Santos Dumont, 1500 - Fortaleza/CE",
  branding: {
    faviconFileName: "favicon-horizonte.svg",
    logoFileName: "logo-horizonte.png",
    primaryColor: "#00285B",
    secondaryColor: "#F58220",
  },
  contactEmail: "contato@horizonte.edu.br",
  contactPhone: "(85) 3333-1100",
  displayName: "Colégio Horizonte",
  internalNotes: "",
  legalName: "Colégio Horizonte",
  operationModel: "PRIVADA",
  status: "ATIVA",
}

// Simulates the latency + async shape of the real GET, so the page's loading/error states are
// exercised the same way they'll behave once fetchMockOrganization is replaced by a real call.
export const fetchMockOrganization = (): Promise<Organization> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(mockOrganization), 600)
  })
