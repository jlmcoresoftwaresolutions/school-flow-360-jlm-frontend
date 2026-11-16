import type { ApiResponse, UserSchoolUnitRequest, UserStatusRequest } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// NOT USED YET. PUT /api/admin/users/{userId}/unit: ties a user to a school unit. ADMIN only. There is
// no users screen yet.
export const assignUserSchoolUnit = async (
  userId: number,
  request: UserSchoolUnitRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.put<ApiResponse<null>>(`/api/admin/users/${userId}/unit`, request, config)
}

// NOT USED YET. PUT /api/admin/users/{userId}/status: turns an account on or off and locks or unlocks
// it. ADMIN only. There is no users screen yet.
export const updateUserStatus = async (
  userId: number,
  request: UserStatusRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.put<ApiResponse<null>>(`/api/admin/users/${userId}/status`, request, config)
}
