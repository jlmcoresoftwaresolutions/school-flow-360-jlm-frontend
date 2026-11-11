import { useTranslation } from "react-i18next"

import type { Address } from "@/models"
import { formatAddress } from "@/utils/address"
import { getCountryName, isCountry } from "@/utils/countries"

import { useOrganizationCountry } from "./organizationCountry"

type FormatOptions = {
  // Adds the country's name at the end (the organization's address; a unit's has the same country).
  showCountry?: boolean
}

// An address on one line, the way its country writes the postal code: "CEP 60150-161" in Brazil, the
// code alone elsewhere. An address without a country of its own is the organization's country's.
export const useAddressFormatter = () => {
  const { i18n, t } = useTranslation()
  const organizationCountry = useOrganizationCountry()

  return (address: Address, options: FormatOptions = {}) => {
    const country = isCountry(address.country) ? address.country : organizationCountry

    return formatAddress(address, {
      countryName: options.showCountry ? getCountryName(country, i18n.language) : undefined,
      postalCodeLabel: country === "BR" ? t("myUnit.address.cep") : undefined,
    })
  }
}
