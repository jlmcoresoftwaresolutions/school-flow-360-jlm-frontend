import { colors } from "@/foundation"
import type {
  BrandingResponse,
  Organization,
  OrganizationBranding,
  OrganizationBrandingUpdate,
  OrganizationEditable,
  OrganizationUpdate,
  SchoolUnit,
  SchoolUnitDetail,
  SchoolUnitInactivation,
  SchoolUnitInput,
} from "@/models"
import { emptyAddress } from "@/utils/address"
import { defaultCountry, toCountry } from "@/utils/countries"
import { startLoading, stopLoading } from "@/utils/loadingStore"
import { toInternationalPhone } from "@/utils/phone"

import {
  getBrandingDraft,
  publishBranding,
  saveBrandingDraft,
  uploadBrandingFavicon,
  uploadBrandingLogo,
} from "../branding"
import type { RequestConfig } from "../httpClient"
import { getCurrentOrganizationEditable, updateCurrentOrganization } from "../organizations"
import { searchSchoolUnits } from "../schoolUnits"

// The page-facing layer of Minha Unidade: it answers in the frontend's shapes (models/organization).
// The API-shaped services, one function per backend endpoint, are organizations, schoolUnits, branding
// and the others beside this folder; the calls here are being moved onto them one at a time. Wired:
// the organization (organizations), its visual identity (branding) and listing the units
// (schoolUnits). Still MOCK: the units' create, edit and inactivate, which act on the fetched list in
// memory with a simulated delay. The signatures are the final ones: wiring a call only changes its
// body (mapping the backend's field names), not the page.

// The organization as the backend last answered it (read or saved), kept for the next save: the backend
// replaces EVERY editable field with what the body brings (one missing becomes null), so each save
// sends all of them, these with the section's changes on top. It also carries the `version` the
// backend asks back, answering 409 when someone else changed the organization since.
let currentOrganization: OrganizationEditable | null = null
// The visual identity as the backend last answered it, for the `version` the next save sends back.
let currentBranding: BrandingResponse | null = null
// The units the mocked create/edit/inactivate work on: the real list, as last fetched, so those
// actions apply to the units on screen (locally only - lost on reload) until they are wired too.
let schoolUnits: SchoolUnit[] = []

const mockDelayMs = 600

// MOCK-ONLY test hook: the E2E suite sets this sessionStorage key to see the page's error state
// ("error" fails every mocked call). The wired calls never read it.
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

// The backend keeps the country as free text: a code or a name ("Brasil") is read as the country's
// code, and anything else as unknown (empty), which the save then leaves untouched. The phone comes as
// stored: the page shows it in its country's format. The backend answers only PRIVATE or PUBLIC for the
// operation model, and ENABLE/DISABLE for the status.
const toOrganization = (editable: OrganizationEditable): Organization => ({
  address: {
    city: editable.orgAddressCity ?? "",
    complement: editable.orgAddressComplement ?? "",
    country: toCountry(editable.orgAddressCountry ?? "") ?? "",
    district: editable.orgAddressDistrict ?? "",
    number: editable.orgAddressNumber ?? "",
    postalCode: editable.orgAddressCep ?? "",
    state: editable.orgAddressState ?? "",
    street: editable.orgAddressStreet ?? "",
  },
  contactEmail: editable.orgEmail ?? "",
  contactPhone: editable.orgInstTel ?? "",
  displayName: editable.orgName ?? "",
  id: editable.orgId,
  institutionalName: editable.orgInstName ?? "",
  internalNotes: editable.orgNotes ?? "",
  operationModel: editable.orgOpType,
  status: editable.orgStatus === "ENABLE" ? "ACTIVE" : "INACTIVE",
})

const keepOrganization = (editable: OrganizationEditable): Organization => {
  currentOrganization = editable

  return toOrganization(editable)
}

// The signed-in user's organization (ADMIN only; 404 when the tenant has none registered yet).
export const getCurrentOrganization = async (config?: RequestConfig): Promise<Organization> =>
  keepOrganization(await getCurrentOrganizationEditable(config))

// Saves the section's changes. Every editable field goes in the body - the ones the section did not
// change exactly as the backend last answered them, so nothing is cleared - with the `version` last
// read. The country is saved as its code ("BR"); an address without one keeps the stored text. A
// phone is saved in the international format, a number without "+" read as one of the organization's
// country (Brazil when it is not known). A 409 means someone else changed the
// organization since: read it again (getCurrentOrganization) and let the user redo the change.
export const updateOrganization = async (update: OrganizationUpdate, config?: RequestConfig): Promise<Organization> => {
  if (!currentOrganization) throw new Error("The organization must be read before it is saved")

  const current = currentOrganization
  const { address } = update
  const phoneCountry = toCountry(current.orgAddressCountry ?? "") ?? defaultCountry

  return keepOrganization(
    await updateCurrentOrganization(
      {
        orgAddressCep: address ? address.postalCode : current.orgAddressCep,
        orgAddressCity: address ? address.city : current.orgAddressCity,
        orgAddressComplement: address ? address.complement : current.orgAddressComplement,
        orgAddressCountry: address?.country || current.orgAddressCountry,
        orgAddressDistrict: address ? address.district : current.orgAddressDistrict,
        orgAddressNumber: address ? address.number : current.orgAddressNumber,
        orgAddressState: address ? address.state : current.orgAddressState,
        orgAddressStreet: address ? address.street : current.orgAddressStreet,
        orgEmail: update.contactEmail ?? current.orgEmail,
        orgInstName: update.institutionalName ?? current.orgInstName,
        // Saved in the international format, whatever country it is from.
        orgInstTel:
          update.contactPhone === undefined
            ? current.orgInstTel
            : toInternationalPhone(update.contactPhone, phoneCountry),
        orgName: update.displayName ?? current.orgName,
        orgNotes: update.internalNotes ?? current.orgNotes,
        version: current.version,
      },
      config,
    ),
  )
}

// The app's own colors, shown (and saved, if the admin keeps them) while nothing was saved yet.
const defaultPrimaryColor = colors.primary[900]
const defaultSecondaryColor = colors.primary[500]

const toBranding = (branding: BrandingResponse): OrganizationBranding => ({
  faviconUrl: branding.favicon?.url ?? undefined,
  hasUnpublishedChanges: !branding.configured || branding.hasUnpublishedChanges,
  logoUrl: branding.logo?.url ?? undefined,
  primaryColor: branding.primaryColor || defaultPrimaryColor,
  publishedLogoUrl: branding.publishedBranding?.logo?.url ?? undefined,
  secondaryColor: branding.secondaryColor || defaultSecondaryColor,
})

const keepBranding = (branding: BrandingResponse): OrganizationBranding => {
  currentBranding = branding

  return toBranding(branding)
}

// The draft and its publication state (ADMIN only).
export const getBranding = async (config?: RequestConfig): Promise<OrganizationBranding> =>
  keepBranding(await getBrandingDraft(config))

// Saves and publishes the identity in one go, as the page has a single "save" for it: the draft (with
// the organization's display name, which the backend asks for its own copy of), then the new logo and
// the new favicon if there are, then the publication. Each step keeps the backend's answer, so after a failure midway
// (a logo refused, file storage off) the next save goes on from the right `version`. A 409 means
// someone else changed the identity since it was read: read it again (getBranding).
export const updateBranding = async (
  update: OrganizationBrandingUpdate,
  config?: RequestConfig,
): Promise<OrganizationBranding> => {
  const displayName = currentOrganization?.orgName?.trim() || currentBranding?.displayName?.trim()
  if (!displayName) throw new Error("The organization's display name is needed to save its identity")

  let branding = await saveBrandingDraft(
    {
      displayName,
      primaryColor: update.primaryColor,
      secondaryColor: update.secondaryColor,
      version: currentBranding?.version ?? undefined,
    },
    config,
  )
  keepBranding(branding)

  if (update.logo) {
    branding = await uploadBrandingLogo(update.logo, config)
    keepBranding(branding)
  }

  if (update.favicon) {
    branding = await uploadBrandingFavicon(update.favicon, config)
    keepBranding(branding)
  }

  if (branding.version === null) throw new Error("The saved draft came without a version")

  return keepBranding(await publishBranding({ version: branding.version }, config))
}

// The backend's largest page: the whole list comes in as few requests as possible.
const unitsPageSize = 100

// The backend keeps the address as one free-text string; until we know its format, all of it goes in
// the street, so it is shown whole and nothing is guessed (the city stays empty). A unit's country is
// its organization's. The phone comes as stored: the page shows it in the organization's country's
// format.
const toSchoolUnit = (unit: SchoolUnitDetail): SchoolUnit => ({
  address: { ...emptyAddress, street: unit.address ?? "" },
  contactEmail: unit.contactEmail ?? "",
  contactPhone: unit.contactPhone ?? "",
  id: unit.schoolUnitId,
  name: unit.unitName,
  notes: "",
  status: unit.operationalStatus,
})

// Only the units the user may access (the backend applies that). The list is paged on the backend;
// every page is fetched, since the page searches, filters and pages the list on its own for now.
export const listSchoolUnits = async (config?: RequestConfig): Promise<SchoolUnit[]> => {
  const units: SchoolUnitDetail[] = []
  let page = 0
  let totalPages = 1

  while (page < totalPages) {
    const result = await searchSchoolUnits({ direction: "asc", page, size: unitsPageSize, sortBy: "unitName" }, config)

    units.push(...result.content)
    totalPages = result.totalPages
    page += 1
  }

  schoolUnits = units.map(toSchoolUnit)

  return structuredClone(schoolUnits)
}

export const createSchoolUnit = (input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  mockRequest(() => {
    const id = Math.max(0, ...schoolUnits.map((unit) => unit.id)) + 1
    const unit: SchoolUnit = { ...structuredClone(input), id, status: "ACTIVE" }

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
        status: "INACTIVE",
      })),
    config,
  )
