import type { Address } from "@/models"

// The Brazilian states (UF), in alphabetical order, for a Brazilian address's state field.
export const brazilianStates = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const

// A blank address, for a form that starts empty.
export const emptyAddress: Address = {
  city: "",
  complement: "",
  country: "",
  district: "",
  number: "",
  postalCode: "",
  state: "",
  street: "",
}

export type FormatAddressOptions = {
  // The country's name, added at the end when given.
  countryName?: string
  // Written before the postal code ("CEP" for a Brazilian address), when given.
  postalCodeLabel?: string
}

const join = (parts: string[], separator: string) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator)

// An address on one line, skipping whatever is missing:
// "Avenida Santos Dumont, 1500, Bloco B - Aldeota, Fortaleza/CE - CEP 60150-161 - Brasil" (with the
// label and the country name given). An empty address gives an empty string.
export const formatAddress = (address: Address, options: FormatAddressOptions = {}) => {
  const { countryName, postalCodeLabel } = options

  const streetLine = join([address.street, address.number, address.complement], ", ")
  const cityLine = join([address.city, address.state], "/")
  const placeLine = join([address.district, cityLine], ", ")
  const postalCode = address.postalCode.trim()
  const postalCodeLine = postalCode ? join([postalCodeLabel ?? "", postalCode], " ") : ""

  return join([streetLine, placeLine, postalCodeLine, countryName ?? ""], " - ")
}

// "Fortaleza/CE", or whichever of the two exists.
export const formatCityState = (address: Address) => join([address.city, address.state], "/")
