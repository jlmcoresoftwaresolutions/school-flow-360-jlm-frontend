import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLoaderData, useLocation, useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard"
import type { IconName } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules/ActionMenu"
import type { BreadcrumbItem } from "@/ds-components/molecules/Breadcrumb"
import { Breadcrumb } from "@/ds-components/molecules/Breadcrumb"
import type { SidebarNavChild, SidebarNavItem } from "@/ds-components/organisms/Sidebar"
import { Sidebar } from "@/ds-components/organisms/Sidebar"
import type { TopbarAction } from "@/ds-components/organisms/Topbar"
import { Topbar } from "@/ds-components/organisms/Topbar"
import { useSchoolBranding, useSchoolBrandingSettled, useSessionExpiry } from "@/hooks"
import type { TranslationResource } from "@/i18n/locales/ptBR"
import type { UserContext } from "@/models"
import { pageRoles } from "@/routes/access"
import type { PathsType } from "@/routes/paths"
import { paths } from "@/routes/paths"
import { renewSession } from "@/services/httpClient"
import { canOpenPage, getDisplayRoles } from "@/utils/access"
import { endExpiredSession } from "@/utils/authRedirect"
import { setDocumentIdentity } from "@/utils/documentIdentity"
import { applySchoolColors } from "@/utils/theme"

import { AppShellBody, AppShellContent, AppShellWrapper } from "./AppShell.styles"

type NavKey = keyof TranslationResource["shell"]["nav"]

// A menu entry that opens a page: its nav key is also its key in paths.
type PageKey = NavKey & keyof PathsType

type NavGroup = {
  children: PageKey[]
  icon: IconName
  key: NavKey
}

// The groups mirror the menu in the P1 "Especificação Visual Final"; the art doesn't specify their
// children, so those are plausible placeholders, each with its own page (blank for now, except
// Minha Organização).
const menuGroups: NavGroup[] = [
  {
    children: [
      "academicOverview",
      "periods",
      "gradeLevels",
      "subjects",
      "offers",
      "rooms",
      "classes",
      "academicCalendar",
      "classDiary",
      "reportCards",
    ],
    icon: "school-outline",
    key: "academic",
  },
  { children: ["tuition", "billing", "contracts", "reconciliation"], icon: "money-outline", key: "finance" },
  { children: ["notices", "messages", "notifications"], icon: "chat-outline", key: "communication" },
  { children: ["academicReports", "financialReports", "exports"], icon: "file-outline", key: "reports" },
  {
    children: ["myOrganization", "peopleSearch", "students", "guardians", "enrollments"],
    icon: "briefcase-outline",
    key: "administration",
  },
  { children: ["userList", "profilesAndPermissions", "invites"], icon: "users-outline", key: "users" },
  { children: ["preferences", "integrations", "security"], icon: "gear-outline", key: "settings" },
  { children: ["recentAccess", "audit", "activeSessions"], icon: "history", key: "accessLogs" },
]

const bottomGroups: NavGroup[] = [{ children: ["helpCenter", "contactSupport"], icon: "help-outline", key: "help" }]

// The trail shown in the topbar for each page, as nav keys: its group, then the page. A group has no
// page of its own, so it is plain text, not a link. The first entry carries the icon of its menu
// entry. A route not listed here shows no breadcrumb.
type BreadcrumbTrail = {
  icon: IconName
  keys: NavKey[]
}

const homeIcon: IconName = "home-outline"

const breadcrumbByPath: Record<string, BreadcrumbTrail> = Object.fromEntries([
  [paths.home, { icon: homeIcon, keys: ["home"] }],
  ...[...menuGroups, ...bottomGroups].flatMap((group) =>
    group.children.map((child): [string, BreadcrumbTrail] => [
      paths[child],
      { icon: group.icon, keys: [group.key, child] },
    ]),
  ),
])

// Whether a path is a page's own or a record under it (/administration/students/12 under the students).
const isUnder = (pathname: string, pagePath: string) => pathname === pagePath || pathname.startsWith(`${pagePath}/`)

// The trail of a page, or of the page a record belongs to (its closest parent path with a trail).
const findBreadcrumb = (pathname: string): BreadcrumbTrail | undefined => {
  let path = pathname
  while (path) {
    const trail = breadcrumbByPath[path]
    if (trail) return trail
    path = path.slice(0, path.lastIndexOf("/"))
  }

  return undefined
}

// Renews the session when its access token expires, even on an idle page, so it doesn't wait for the
// next request to be refused; one the backend won't renew ends there. An unreachable backend keeps the
// session (it is tried again later).
const renewOrEndSession = async (): Promise<boolean> => {
  try {
    if (await renewSession()) return true
  } catch {
    return true
  }

  endExpiredSession(paths.login)
  return false
}

// This template is the app's own shell rather than a reusable piece, so - like the pages - it
// translates its copy instead of taking it through props. Nav keys double as React keys, so they
// stay stable whatever the language. Who signed in comes from its route's loader (the session's
// context, read again from /api/me once per visit): their name and roles go in the topbar, and the
// menu leaves out the pages their roles don't open.
export const AppShell = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = (useLoaderData() as UserContext | null | undefined) ?? null

  const { t } = useTranslation()
  useSessionExpiry(renewOrEndSession)
  const branding = useSchoolBranding()
  const isBrandingSettled = useSchoolBrandingSettled()

  const navLabel = (key: NavKey) => t(`shell.nav.${key}`)

  const toNavLink = (key: PageKey): SidebarNavChild => ({
    active: isUnder(location.pathname, paths[key]),
    key,
    label: navLabel(key),
    onClick: () => navigate(paths[key]),
  })

  const canOpen = (key: PageKey) => canOpenPage(user, pageRoles[key])

  const toNavItem = (group: NavGroup): SidebarNavItem => ({
    children: group.children.filter(canOpen).map(toNavLink),
    icon: group.icon,
    key: group.key,
    label: navLabel(group.key),
  })

  // A group left without any page the user can open isn't shown at all.
  const toNavItems = (groups: NavGroup[]) => groups.map(toNavItem).filter((item) => item.children?.length)

  const items: SidebarNavItem[] = [{ ...toNavLink("home"), icon: homeIcon }, ...toNavItems(menuGroups)]

  const bottomItems: SidebarNavItem[] = toNavItems(bottomGroups)

  const userName = user?.fullName?.trim() || user?.email || user?.nickname || t("shell.account")
  const userRoles = getDisplayRoles(user)
    .map((role) => t(`shell.roles.${role}`))
    .join(", ")

  // The art puts notifications and help in the topbar, but neither feature exists yet, so - like the
  // menu entries without a page - they are rendered disabled instead of as buttons that do nothing.
  const topbarActions: TopbarAction[] = [
    { disabled: true, icon: "bell-outline", key: "notifications", label: t("shell.notifications") },
    { disabled: true, icon: "help-outline", key: "help", label: t("shell.help") },
  ]

  // The own profile and signing out live in the menu the user block opens.
  const userMenuItems: ActionMenuItem[] = [
    { icon: "user-outline", key: "myProfile", label: t("shell.myProfile"), onClick: () => navigate(paths.myProfile) },
    { icon: "logout-outline", key: "signOut", label: t("shell.signOut"), onClick: () => navigate(paths.signOut) },
  ]

  const breadcrumbTrail = findBreadcrumb(location.pathname)
  const breadcrumbItems: BreadcrumbItem[] | undefined = breadcrumbTrail?.keys.map((key, index) => ({
    icon: index === 0 ? breadcrumbTrail.icon : undefined,
    key,
    label: navLabel(key),
  }))

  // The school's published identity, when there is one: its favicon (square, so it fills the menu's
  // icon slot, the rail included) or else its logo, its name, and the product's discreet "Powered by";
  // the tab shows the page and the school. Without one, the product's own look stays.
  const pageLabel = breadcrumbItems?.at(-1)?.label
  const tabTitle = branding ? [pageLabel, branding.displayName].filter(Boolean).join(" · ") : null
  const isBrandingKnown = branding !== undefined
  const primaryColor = branding?.primaryColor
  const secondaryColor = branding?.secondaryColor ?? null
  const brandIcon = branding?.faviconUrl ?? branding?.logoUrl ?? schoolFlowIcon

  useEffect(() => {
    setDocumentIdentity({ faviconUrl: branding?.faviconUrl ?? null, title: tabTitle })
  }, [branding?.faviconUrl, tabTitle])

  // Until the identity is first read, the colors kept from the last visit stay.
  useEffect(() => {
    if (!isBrandingKnown) return
    applySchoolColors(primaryColor ? { primaryColor, secondaryColor } : null)
  }, [isBrandingKnown, primaryColor, secondaryColor])

  return (
    <AppShellWrapper>
      <Sidebar
        bottomItems={bottomItems}
        // Until the identity is first read, placeholders: not the product's look, which the school's would
        // replace a moment later.
        brandLoading={!isBrandingSettled}
        collapseLabel={t("shell.collapseMenu")}
        expandLabel={t("shell.expandMenu")}
        items={items}
        logoAlt={branding ? t("shell.schoolLogoAlt", { name: branding.displayName }) : t("shell.logoAlt")}
        logoSrc={brandIcon}
        navLabel={t("shell.mainNavigation")}
        // The product's name and its "Powered by" are brand terms, not translated copy.
        subtitle={branding ? "Powered by SchoolFlow360º" : undefined}
        title={branding?.displayName ?? "SchoolFlow360º"}
      />

      {/* Covers every way out of a page with unsaved changes: the menu, the topbar (signing out) and
          the page's own links. */}
      <UnsavedChangesGuard>
        <AppShellBody>
          <Topbar
            actions={topbarActions}
            user={{ name: userName, role: userRoles || undefined }}
            userMenuItems={userMenuItems}
            userMenuLabel={t("shell.userMenu")}
          >
            {breadcrumbItems && <Breadcrumb items={breadcrumbItems} label={t("shell.breadcrumbLabel")} />}
          </Topbar>

          <AppShellContent>
            <Outlet />
          </AppShellContent>
        </AppShellBody>
      </UnsavedChangesGuard>
    </AppShellWrapper>
  )
}
