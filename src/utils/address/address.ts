import type { Address } from "@/models"

// The Brazilian states (UF), in alphabetical order, for an address's state field.
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
  cep: "",
  city: "",
  complement: "",
  district: "",
  number: "",
  state: "",
  street: "",
}

const join = (parts: string[], separator: string) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator)

// An address on one line, skipping whatever is missing:
// "Avenida Santos Dumont, 1500, Bloco B - Aldeota, Fortaleza/CE - CEP 60150-161". An empty address
// gives an empty string.
export const formatAddress = (address: Address) => {
  const streetLine = join([address.street, address.number, address.complement], ", ")
  const cityLine = join([address.city, address.state], "/")
  const placeLine = join([address.district, cityLine], ", ")
  const cepLine = address.cep.trim() ? `CEP ${address.cep.trim()}` : ""

  return join([streetLine, placeLine, cepLine], " - ")
}

// "Fortaleza/CE", or whichever of the two exists.
export const formatCityState = (address: Address) => join([address.city, address.state], "/")
