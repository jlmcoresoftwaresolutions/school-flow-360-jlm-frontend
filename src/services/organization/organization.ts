import type {
  Organization,
  OrganizationBranding,
  OrganizationBrandingUpdate,
  OrganizationUpdate,
  SchoolUnit,
  SchoolUnitInactivation,
  SchoolUnitInput,
} from "@/models"
import { startLoading, stopLoading } from "@/utils/loadingStore"

import type { RequestConfig } from "../httpClient"
import { mockBranding, mockOrganization, mockSchoolUnits } from "./organization.mock"

// MOCK: Minha Unidade's calls answer from in-memory demo data (organization.mock.ts), with a
// simulated delay, until the backend offers the signed-in user's organization (there is no "current
// organization" endpoint yet). The signatures are the final ones: wiring the real API only changes
// these function bodies (through httpClient, mapping the backend's field names), not the page.

// Copies, so a caller changing what it got never changes the "stored" data.
let organization = structuredClone(mockOrganization)
let branding = structuredClone(mockBranding)
let schoolUnits = structuredClone(mockSchoolUnits)

const mockDelayMs = 600

// MOCK-ONLY test hook: the E2E suite sets this sessionStorage key to see the page's empty and error
// states ("error" fails every call, "no-units" answers an empty unit list). The real service won't
// read it.
const mockScenarioKey = "sf360.mockScenario"

const readMockScenario = (): string | null => {
  try {
    return sessionStorage.getItem(mockScenarioKey)
  } catch {
    return null
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Behaves like an httpClient call: shows the global loading overlay unless showLoading is false,
// takes a moment, and fails in the "error" scenario.
const mockRequest = async <T>(answer: () => T, config?: RequestConfig): Promise<T> => {
  const showLoading = config?.showLoading !== false

  if (showLoading) startLoading()

  try {
    await wait(mockDelayMs)

    if (readMockScenario() === "error") throw new Error("Mock request failed")

    return structuredClone(answer())
  } finally {
    if (showLoading) stopLoading()
  }
}

// A data URL rather than an object URL, so it survives being copied and never needs revoking.
const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsDataURL(file)
  })

export const getCurrentOrganization = (config?: RequestConfig): Promise<Organization> =>
  mockRequest(() => organization, config)

export const updateOrganization = (update: OrganizationUpdate, config?: RequestConfig): Promise<Organization> =>
  mockRequest(() => {
    organization = { ...organization, ...structuredClone(update) }
    return organization
  }, config)

export const getBranding = (config?: RequestConfig): Promise<OrganizationBranding> =>
  mockRequest(() => branding, config)

export const updateBranding = async (
  update: OrganizationBrandingUpdate,
  config?: RequestConfig,
): Promise<OrganizationBranding> => {
  const logoUrl = update.logo ? await readFileAsDataUrl(update.logo) : branding.logoUrl
  const faviconUrl = update.favicon ? await readFileAsDataUrl(update.favicon) : branding.faviconUrl

  return mockRequest(() => {
    branding = {
      displayName: update.displayName,
      faviconUrl,
      logoUrl,
      primaryColor: update.primaryColor,
      secondaryColor: update.secondaryColor,
    }
    return branding
  }, config)
}

// Only the units the user may access - in the mock, all of the organization's.
export const listSchoolUnits = (config?: RequestConfig): Promise<SchoolUnit[]> =>
  mockRequest(() => (readMockScenario() === "no-units" ? [] : schoolUnits), config)

export const createSchoolUnit = (input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  mockRequest(() => {
    const id = Math.max(0, ...schoolUnits.map((unit) => unit.id)) + 1
    const unit: SchoolUnit = { ...structuredClone(input), id, status: "ATIVA" }

    schoolUnits = [...schoolUnits, unit]
    return unit
  }, config)

const replaceSchoolUnit = (id: number, change: (unit: SchoolUnit) => SchoolUnit): SchoolUnit => {
  const current = schoolUnits.find((unit) => unit.id === id)
  if (!current) throw new Error(`School unit ${id} not found`)

  const next = change(current)
  schoolUnits = schoolUnits.map((unit) => (unit.id === id ? next : unit))

  return next
}

export const updateSchoolUnit = (id: number, input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  mockRequest(() => replaceSchoolUnit(id, (unit) => ({ ...unit, ...structuredClone(input) })), config)

// Inactivating isn't deleting: the unit stays, marked inactive, with when and why.
export const inactivateSchoolUnit = (
  id: number,
  inactivation: SchoolUnitInactivation,
  config?: RequestConfig,
): Promise<SchoolUnit> =>
  mockRequest(
    () =>
      replaceSchoolUnit(id, (unit) => ({
        ...unit,
        inactivatedAt: new Date().toISOString(),
        inactivationReason: inactivation.reason,
        status: "INATIVA",
      })),
    config,
  )
