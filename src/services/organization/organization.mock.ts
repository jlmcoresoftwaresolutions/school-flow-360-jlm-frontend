import type { Organization, OrganizationBranding, SchoolUnit } from "@/models"

// Demo data for Minha Unidade until the real API is wired (see organization.ts). It is a fictional
// school, kept only in memory: every change is lost on reload, and nothing here is a real client's.

// A self-contained logo and favicon, so the mock doesn't depend on an external image host.
const svgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

const logoUrl = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect width="300" height="100" rx="16" fill="#00285B"/><circle cx="58" cy="50" r="26" fill="#F58220"/><text x="100" y="62" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#FFFFFF">Horizonte</text></svg>`,
)

const faviconUrl = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#00285B"/><circle cx="16" cy="16" r="8" fill="#F58220"/></svg>`,
)

export const mockOrganization: Organization = {
  address: {
    cep: "60150-161",
    city: "Fortaleza",
    complement: "",
    district: "Aldeota",
    number: "1500",
    state: "CE",
    street: "Avenida Santos Dumont",
  },
  contactEmail: "contato@horizonte.edu.br",
  contactPhone: "(85) 3333-1100",
  id: 1,
  institutionalName: "Associação Educacional Horizonte",
  internalNotes: "",
  operationModel: "PRIVADA",
  status: "ATIVA",
}

export const mockBranding: OrganizationBranding = {
  displayName: "Colégio Horizonte",
  faviconUrl,
  logoUrl,
  primaryColor: "#00285B",
  secondaryColor: "#F58220",
}

export const mockSchoolUnits: SchoolUnit[] = [
  {
    address: {
      cep: "60150-161",
      city: "Fortaleza",
      complement: "",
      district: "Aldeota",
      number: "1500",
      state: "CE",
      street: "Avenida Santos Dumont",
    },
    contactEmail: "aldeota@horizonte.edu.br",
    contactPhone: "(85) 3333-1100",
    id: 1,
    name: "Unidade Aldeota",
    notes: "",
    status: "ATIVA",
  },
  {
    address: {
      cep: "60811-341",
      city: "Fortaleza",
      complement: "Bloco B",
      district: "Edson Queiroz",
      number: "2200",
      state: "CE",
      street: "Avenida Washington Soares",
    },
    contactEmail: "edsonqueiroz@horizonte.edu.br",
    contactPhone: "(85) 3333-1200",
    id: 2,
    name: "Unidade Edson Queiroz",
    notes: "",
    status: "ATIVA",
  },
  {
    address: {
      cep: "61600-000",
      city: "Caucaia",
      complement: "",
      district: "Centro",
      number: "45",
      state: "CE",
      street: "Rua Coronel Correia",
    },
    contactEmail: "caucaia@horizonte.edu.br",
    contactPhone: "(85) 3342-0400",
    id: 3,
    name: "Unidade Caucaia",
    notes: "",
    status: "ATIVA",
  },
  {
    address: {
      cep: "60325-000",
      city: "Fortaleza",
      complement: "",
      district: "Benfica",
      number: "830",
      state: "CE",
      street: "Avenida da Universidade",
    },
    contactEmail: "",
    contactPhone: "(85) 3281-0900",
    id: 4,
    inactivatedAt: "2026-08-14T12:00:00.000Z",
    inactivationReason: "Prédio devolvido ao fim do contrato de locação.",
    name: "Unidade Benfica",
    notes: "",
    status: "INATIVA",
  },
]
