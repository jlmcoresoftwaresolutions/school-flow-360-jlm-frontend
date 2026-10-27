// The school (tenant) the app is serving. The backend keeps each school's data apart and needs it on
// every request, the login included, in the X-Tenant-ID header (see httpClient.ts).
//
// For now it is fixed per deploy through VITE_TENANT_ID (.env). The plan is to read it from the
// subdomain instead (e.g. schoolflow-demo.<domain> -> schoolflow_demo); this function is the only
// place that has to change for that.
export const getTenantId = (): string | null => import.meta.env.VITE_TENANT_ID?.trim() || null
