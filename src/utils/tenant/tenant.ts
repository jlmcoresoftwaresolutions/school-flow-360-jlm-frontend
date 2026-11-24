// The school (tenant) the app is serving. The backend keeps each school's data apart and needs it on
// every request, the login included, in the X-Tenant-ID header (see httpClient.ts).
//
// Each school has its own address under the platform's domain (VITE_TENANT_DOMAIN): the first part of
// the address is the school, with "-" where its tenant has "_" (colegio-saber.schoolflow360.com.br is
// colegio_saber). The domain itself, a reserved name (www, app, api) or one the backend would refuse
// serves no school. Any other address - localhost, the Render one - serves the fixed VITE_TENANT_ID,
// which only development sets (.env.development); in production such an address serves no school.

// Names under the domain that are never a school.
const reservedNames = ["api", "app", "www"]

// The backend's own rule for a tenant: lowercase letters, digits and "_", up to 63 characters.
const tenantPattern = /^[a-z0-9_]{1,63}$/

// The platform's domain, lowercase and without dots around it ("schoolflow360.com.br"), or null.
export const getTenantDomain = (): string | null =>
  import.meta.env.VITE_TENANT_DOMAIN?.trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "") || null

// The tenant an address under the domain names ("colegio-saber" -> "colegio_saber"), or null when it
// names none (the domain itself, a reserved name, more than one level, an invalid name).
const tenantOfHost = (hostname: string, domain: string): string | null => {
  const host = hostname.trim().toLowerCase()
  if (!host.endsWith(`.${domain}`)) return null

  const name = host.slice(0, -(domain.length + 1))
  if (name.includes(".") || reservedNames.includes(name)) return null

  const tenant = name.replace(/-/g, "_")

  return tenantPattern.test(tenant) ? tenant : null
}

// The school this address serves, or null when it serves none (the app then says so and asks for the
// school's own address).
export const getTenantId = (hostname: string = window.location.hostname): string | null => {
  const domain = getTenantDomain()
  const host = hostname.trim().toLowerCase()

  if (domain && (host === domain || host.endsWith(`.${domain}`))) return tenantOfHost(host, domain)

  return import.meta.env.VITE_TENANT_ID?.trim() || null
}

// Where the app must go to show `path` to the school a link carries (the invitation and password reset
// e-mails name their school): that school's own address, when the one opened serves no school (the
// Render one, in production) or is another school's. Null when the address opened can show it: it is
// that school's, or it isn't one of the platform's at all (localhost, in development).
export const getSchoolAddress = (
  tenantId: string,
  path: string,
  hostname: string = window.location.hostname,
): string | null => {
  const domain = getTenantDomain()
  const current = getTenantId(hostname)
  if (!domain || current === tenantId || !tenantPattern.test(tenantId)) return null

  const host = hostname.trim().toLowerCase()
  const isPlatformAddress = host === domain || host.endsWith(`.${domain}`)
  if (current && !isPlatformAddress) return null

  return `https://${tenantId.replace(/_/g, "-")}.${domain}${path}`
}
