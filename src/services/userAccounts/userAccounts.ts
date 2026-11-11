import type { ApiResponse, AssignUserSchoolUnitPayload, UpdateUserStatusPayload } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// The two admin endpoints below take a body of `{ request, actor }`. The Swagger documents `actor` as a
// whole User (with its password), which is most likely the authenticated principal shown by mistake;
// until the backend team confirms it, do not send an actor.

// NOT USED YET. PUT /api/admin/users/{userId}/unit: ties a user to a school unit. ADMIN only. There is
// no users screen yet.
export const assignUserSchoolUnit = async (
  userId: number,
  payload: AssignUserSchoolUnitPayload,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.put<ApiResponse<null>>(`/api/admin/users/${userId}/unit`, payload, config)
}

// NOT USED YET. PUT /api/admin/users/{userId}/status: turns an account on or off and locks or unlocks
// it. ADMIN only. There is no users screen yet.
export const updateUserStatus = async (
  userId: number,
  payload: UpdateUserStatusPayload,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.put<ApiResponse<null>>(`/api/admin/users/${userId}/status`, payload, config)
}
