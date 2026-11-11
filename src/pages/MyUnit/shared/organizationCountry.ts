import { createContext, useContext } from "react"

import type { Country } from "@/utils/countries"
import { defaultCountry } from "@/utils/countries"

// The organization's country, which every part of Minha Unidade follows: how phones without "+" are
// read and shown, and how a unit's address (which has no country of its own) is filled. Brazil until
// the organization has a known one.
export const OrganizationCountryContext = createContext<Country>(defaultCountry)

export const useOrganizationCountry = () => useContext(OrganizationCountryContext)
