import type { ViaCepAddress } from "@/models"
import { stripNonDigits } from "@/utils/formats"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// Experimental call validating the src/services structure with axios against a real public API
// (ViaCEP - a free Brazilian postal code lookup, no auth required).
export const getAddressByCep = async (cep: string, config?: RequestConfig): Promise<ViaCepAddress> => {
  const digits = stripNonDigits(cep)
  const response = await httpClient.get<ViaCepAddress>(`https://viacep.com.br/ws/${digits}/json/`, config)

  return response.data
}
