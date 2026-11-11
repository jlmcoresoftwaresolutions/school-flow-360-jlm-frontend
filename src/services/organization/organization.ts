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
  SchoolUnitInactivationImpact,
  SchoolUnitInput,
} from "@/models"
import { defaultCountry, toCountry } from "@/utils/countries"
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
import {
  addSchoolUnit,
  checkSchoolUnitDeactivation,
  deactivateSchoolUnit,
  editSchoolUnit,
  searchSchoolUnits,
} from "../schoolUnits"

// The page-facing layer of Minha Unidade: it answers in the frontend's shapes (models/organization),
// over the API-shaped services beside this folder (organizations, branding, schoolUnits), which have
// one function per backend endpoint in the backend's own names. Everything here is wired to the
// backend; mapping the field names, and keeping what a later save needs, is this file's job.

// The organization as the backend last answered it (read or saved), kept for the next save: the backend
// replaces EVERY editable field with what the body brings (one missing becomes null), so each save
// sends all of them, these with the section's changes on top. It also carries the `version` the
// backend asks back, answering 409 when someone else changed the organization since.
let currentOrganization: OrganizationEditable | null = null
// The visual identity as the backend last answered it, for the `version` the next save sends back.
let currentBranding: BrandingResponse | null = null

// The organization's country, which a phone without "+" is read as one of (Brazil when not known).
const getOrganizationCountry = () => toCountry(currentOrganization?.orgAddressCountry ?? "") ?? defaultCountry

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
            : toInternationalPhone(update.contactPhone, getOrganizationCountry()),
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
  publishedFaviconUrl: branding.publishedBranding?.favicon?.url ?? undefined,
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

// A unit has no country of its own (it is its organization's), so the address comes without one. A
// unit from before structured addresses has no street: its fields come empty and the old text goes in
// `legacyAddress`. The phone comes as stored: the page shows it in the organization's country's format.
const toSchoolUnit = (unit: SchoolUnitDetail): SchoolUnit => ({
  address: {
    city: unit.addressCity ?? "",
    complement: unit.addressComplement ?? "",
    country: "",
    district: unit.addressDistrict ?? "",
    number: unit.addressNumber ?? "",
    postalCode: unit.addressCep ?? "",
    state: unit.addressState ?? "",
    street: unit.addressStreet ?? "",
  },
  contactEmail: unit.contactEmail ?? "",
  contactPhone: unit.contactPhone ?? "",
  id: unit.schoolUnitId,
  inactivatedAt: unit.inactivatedAt ?? undefined,
  inactivationReason: unit.inactivationReason ?? undefined,
  legacyAddress: unit.addressStreet ? undefined : unit.address || undefined,
  name: unit.unitName,
  notes: unit.unitNotes ?? "",
  status: unit.operationalStatus,
  version: unit.version,
})

// The body of a create or an edit: the structured address (the backend composes its one-text copy)
// and the phone in the international format, a number without "+" read as one of the organization's
// country.
const toSchoolUnitRequest = (input: SchoolUnitInput) => ({
  addressCep: input.address.postalCode,
  addressCity: input.address.city,
  addressComplement: input.address.complement,
  addressDistrict: input.address.district,
  addressNumber: input.address.number,
  addressState: input.address.state,
  addressStreet: input.address.street,
  contactEmail: input.contactEmail,
  contactPhone: toInternationalPhone(input.contactPhone, getOrganizationCountry()),
  unitName: input.name,
  unitNotes: input.notes,
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

  return units.map(toSchoolUnit)
}

// Registers a unit, which starts active. A name another unit already has is refused (the error's code
// is UNIT_NAME_DUPLICATE, see getErrorCode).
export const createSchoolUnit = async (input: SchoolUnitInput, config?: RequestConfig): Promise<SchoolUnit> =>
  toSchoolUnit(await addSchoolUnit(toSchoolUnitRequest(input), config))

// Saves a unit's data, with the `version` it was read at: when someone else changed the unit since,
// the error's code is VERSION_CONFLICT (read the list again); a name taken, UNIT_NAME_DUPLICATE.
export const updateSchoolUnit = async (
  unit: Pick<SchoolUnit, "id" | "version">,
  input: SchoolUnitInput,
  config?: RequestConfig,
): Promise<SchoolUnit> =>
  toSchoolUnit(await editSchoolUnit(unit.id, { ...toSchoolUnitRequest(input), version: unit.version }, config))

// What inactivating the unit would affect, to show before asking for the confirmation.
export const getSchoolUnitInactivationImpact = async (
  id: number,
  config?: RequestConfig,
): Promise<SchoolUnitInactivationImpact> => {
  const check = await checkSchoolUnitDeactivation(id, config)

  return {
    assignedUsers: check.assignedUsers,
    canInactivate: check.canDeactivate,
    enabledAssignedUsers: check.enabledAssignedUsers,
    requiresConfirmation: check.requiresConfirmation,
    version: check.version,
  }
}

// Inactivating isn't deleting: the unit stays, marked inactive, with when and why. It goes with the
// version the impact was read at (VERSION_CONFLICT when the unit changed since).
export const inactivateSchoolUnit = async (
  id: number,
  inactivation: SchoolUnitInactivation,
  config?: RequestConfig,
): Promise<SchoolUnit> =>
  toSchoolUnit(
    await deactivateSchoolUnit(
      id,
      {
        confirmImpacts: inactivation.confirmImpacts,
        reason: inactivation.reason,
        version: inactivation.version,
      },
      config,
    ),
  )
