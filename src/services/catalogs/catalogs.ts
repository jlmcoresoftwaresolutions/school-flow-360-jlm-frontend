import type { ApiResponse, CatalogItem } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P03 controlled catalogs: data kept by the backend, never hardcoded on screen.

// USED by the link and invitation forms. GET /api/catalogs/relationship-types: the relationships a link may have (Mãe, Pai...).
export const listRelationshipTypes = async (config?: RequestConfig): Promise<CatalogItem[]> => {
  const response = await httpClient.get<ApiResponse<CatalogItem[]>>("/api/catalogs/relationship-types", config)

  return unwrapApiResponse(response)
}

// USED by the person forms. GET /api/catalogs/document-types: the personal document types (CPF, RG...), none
// mandatory; `hasExpiry` says which have an expiry date.
export const listDocumentTypes = async (config?: RequestConfig): Promise<CatalogItem[]> => {
  const response = await httpClient.get<ApiResponse<CatalogItem[]>>("/api/catalogs/document-types", config)

  return unwrapApiResponse(response)
}
