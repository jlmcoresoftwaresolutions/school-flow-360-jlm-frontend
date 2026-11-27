import type {
  ApiResponse,
  LifecycleLockPolicy,
  LifecycleLockPolicyWrite,
  LifecycleNoEffectRule,
  LifecycleNoEffectRuleWrite,
  LifecycleNotificationTemplate,
  LifecycleNotificationTemplateWrite,
  LifecycleTemplateType,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The policies the lifecycle events read (backend LifecyclePolicyController, docs/P06_CONTRATO.md, Fatia H):
// the maximum length of a lock, the "no financial effect" rule and the text of each notification. The Admin
// publishes; the Admin and the Secretaria of the units read. Nothing is code: each is data the school
// publishes.

// USED by the lifecycle policies page. GET /api/lifecycle-policies/lock?unitId=: the lock policies in reach.
export const listLockPolicies = async (unitId?: number, config?: RequestConfig): Promise<LifecycleLockPolicy[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleLockPolicy[]>>("/api/lifecycle-policies/lock", {
    ...config,
    params: { unitId },
  })

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. PUT /api/lifecycle-policies/lock: the Admin publishes a unit and
// stage's maximum (1 to 366 days). Errors: 400, 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.
export const publishLockPolicy = async (
  request: LifecycleLockPolicyWrite,
  config?: RequestConfig,
): Promise<LifecycleLockPolicy> => {
  const response = await httpClient.put<ApiResponse<LifecycleLockPolicy>>(
    "/api/lifecycle-policies/lock",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. POST /api/lifecycle-policies/lock/{id}/withdraw: the scope has no
// policy again (a lock there is blocked). Errors: 404 LOCK_POLICY_NOT_FOUND, 409 VERSION_CONFLICT.
export const withdrawLockPolicy = async (
  policyId: number,
  version: number,
  config?: RequestConfig,
): Promise<LifecycleLockPolicy> => {
  const response = await httpClient.post<ApiResponse<LifecycleLockPolicy>>(
    `/api/lifecycle-policies/lock/${policyId}/withdraw`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. GET /api/lifecycle-policies/financial-no-effect?unitId=: the rules in reach.
export const listNoEffectRules = async (unitId?: number, config?: RequestConfig): Promise<LifecycleNoEffectRule[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleNoEffectRule[]>>(
    "/api/lifecycle-policies/financial-no-effect",
    { ...config, params: { unitId } },
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. PUT /api/lifecycle-policies/financial-no-effect: the Admin publishes
// (or publishes again) the rule of a unit, offer and event type. Errors: 400 (an offer of another unit, an
// empty reference or evidence), 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.
export const publishNoEffectRule = async (
  request: LifecycleNoEffectRuleWrite,
  config?: RequestConfig,
): Promise<LifecycleNoEffectRule> => {
  const response = await httpClient.put<ApiResponse<LifecycleNoEffectRule>>(
    "/api/lifecycle-policies/financial-no-effect",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. POST /api/lifecycle-policies/financial-no-effect/{id}/withdraw.
// Errors: 404 NO_EFFECT_RULE_NOT_FOUND, 409 VERSION_CONFLICT.
export const withdrawNoEffectRule = async (
  ruleId: number,
  version: number,
  config?: RequestConfig,
): Promise<LifecycleNoEffectRule> => {
  const response = await httpClient.post<ApiResponse<LifecycleNoEffectRule>>(
    `/api/lifecycle-policies/financial-no-effect/${ruleId}/withdraw`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. GET /api/lifecycle-policies/notification-templates: the subject and
// text of each notification.
export const listNotificationTemplates = async (config?: RequestConfig): Promise<LifecycleNotificationTemplate[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleNotificationTemplate[]>>(
    "/api/lifecycle-policies/notification-templates",
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle policies page. PUT /api/lifecycle-policies/notification-templates/{eventType}: the
// Admin edits a text. Errors: 400 (a field that doesn't exist, an empty subject or text), 409
// VERSION_CONFLICT.
export const updateNotificationTemplate = async (
  eventType: LifecycleTemplateType,
  request: LifecycleNotificationTemplateWrite,
  config?: RequestConfig,
): Promise<LifecycleNotificationTemplate> => {
  const response = await httpClient.put<ApiResponse<LifecycleNotificationTemplate>>(
    `/api/lifecycle-policies/notification-templates/${eventType}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
