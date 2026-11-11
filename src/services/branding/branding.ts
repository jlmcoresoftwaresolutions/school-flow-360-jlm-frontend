import type {
  ApiResponse,
  BrandingRequest,
  BrandingResponse,
  PublishBrandingRequest,
  PublishedBrandingResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, toFileFormData, unwrapApiResponse } from "../httpClient"

// The visual identity endpoints, one function per route, in the backend's own shapes (models/branding).
// The backend works with a DRAFT that only reaches the users once it is published. Everything but
// getPublishedBranding is ADMIN only. services/organization is the page-facing layer for Minha
// Unidade (which still saves straight, with a favicon the backend does not have); its calls are being
// moved onto these one at a time.

// NOT USED YET. GET /api/organizations/current/branding: the draft and its publication state
// (`configured` false when nothing was saved yet). The branding tab could be fed by it; for now it
// reads the mock.
export const getBrandingDraft = async (config?: RequestConfig): Promise<BrandingResponse> => {
  const response = await httpClient.get<ApiResponse<BrandingResponse>>("/api/organizations/current/branding", config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/organizations/current/branding: creates or updates the draft (nothing changes
// for the users until it is published). Leave `version` out the first time. 400 for an empty or too
// long displayName or a color outside #RRGGBB, 409 when the `version` is stale, 428 when the branding
// exists and no `version` was sent.
export const saveBrandingDraft = async (
  request: BrandingRequest,
  config?: RequestConfig,
): Promise<BrandingResponse> => {
  const response = await httpClient.put<ApiResponse<BrandingResponse>>(
    "/api/organizations/current/branding",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/organizations/current/branding/publish: makes the draft the branding in force
// (name, colors and logo are copied to the published version) and records an audit event. It needs the
// primary color (422 without it), 409 when the draft changed since the admin saw it (or was never
// saved), 503 when file storage is off and there is a logo to publish.
export const publishBranding = async (
  request: PublishBrandingRequest,
  config?: RequestConfig,
): Promise<BrandingResponse> => {
  const response = await httpClient.post<ApiResponse<BrandingResponse>>(
    "/api/organizations/current/branding/publish",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/organizations/current/branding/logo: uploads the draft's logo (201), replacing
// the previous one, and answers the updated branding. The draft must already be saved (409 otherwise).
// PNG or JPEG up to 2 MB, 64 to 2048 px a side, ratio up to 4:1, and the real content is checked, not
// just the extension: 413 when larger, 415 for another type or content that does not match, 422 for
// dimensions or ratio outside the limits, 503 when file storage is off. Users only see it after
// publishBranding.
export const uploadBrandingLogo = async (file: File, config?: RequestConfig): Promise<BrandingResponse> => {
  const response = await httpClient.post<ApiResponse<BrandingResponse>>(
    "/api/organizations/current/branding/logo",
    toFileFormData(file),
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. DELETE /api/organizations/current/branding/logo: removes the DRAFT's logo; the
// published branding keeps its logo until the next publication. 409 when the draft was never saved,
// 503 when file storage is off.
export const removeBrandingLogo = async (config?: RequestConfig): Promise<BrandingResponse> => {
  const response = await httpClient.delete<ApiResponse<BrandingResponse>>(
    "/api/organizations/current/branding/logo",
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/organizations/current/branding/published: the branding every screen should
// apply, open to ANY signed-in user of the tenant, not just an ADMIN. A 404 means nothing was published
// yet: use the default look. The app could theme itself from it after login.
export const getPublishedBranding = async (config?: RequestConfig): Promise<PublishedBrandingResponse> => {
  const response = await httpClient.get<ApiResponse<PublishedBrandingResponse>>(
    "/api/organizations/current/branding/published",
    config,
  )

  return unwrapApiResponse(response)
}
