import { useTranslation } from "react-i18next"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { UnsavedChangesGuard } from "@/components"
import type { IconName } from "@/ds-components/atoms"
import type { ActionMenuItem, BreadcrumbItem } from "@/ds-components/molecules"
import { Breadcrumb } from "@/ds-components/molecules"
import type { SidebarNavChild, SidebarNavItem, TopbarAction } from "@/ds-components/organisms"
import { Sidebar, Topbar } from "@/ds-components/organisms"
import { useSessionExpiry } from "@/hooks"
import type { TranslationResource } from "@/i18n/locales/ptBR"
import type { PathsType } from "@/routes/paths"
import { paths } from "@/routes/paths"
import { endExpiredSession } from "@/utils/authRedirect"

import { currentUserMock } from "./AppShell.mock"
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
// Minha Unidade).
const menuGroups: NavGroup[] = [
  { children: ["classes", "subjects", "classDiary", "reportCards"], icon: "school-outline", key: "academic" },
  { children: ["tuition", "billing", "contracts", "reconciliation"], icon: "money-outline", key: "finance" },
  { children: ["notices", "messages", "notifications"], icon: "chat-outline", key: "communication" },
  { children: ["academicReports", "financialReports", "exports"], icon: "file-outline", key: "reports" },
  { children: ["minhaUnidade"], icon: "briefcase-outline", key: "administration" },
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

// This template is the app's own shell rather than a reusable piece, so - like the pages - it
// translates its copy instead of taking it through props. Nav keys double as React keys, so they
// stay stable whatever the language.
export const AppShell = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const { t } = useTranslation()
  // Ends the session at its expiry time even if the page sits idle, instead of waiting for the next
  // request to be refused.
  useSessionExpiry(() => endExpiredSession(paths.login))

  const navLabel = (key: NavKey) => t(`shell.nav.${key}`)

  const toNavLink = (key: PageKey): SidebarNavChild => ({
    active: location.pathname === paths[key],
    key,
    label: navLabel(key),
    onClick: () => navigate(paths[key]),
  })

  const toNavItem = (group: NavGroup): SidebarNavItem => ({
    children: group.children.map(toNavLink),
    icon: group.icon,
    key: group.key,
    label: navLabel(group.key),
  })

  const items: SidebarNavItem[] = [{ ...toNavLink("home"), icon: homeIcon }, ...menuGroups.map(toNavItem)]

  const bottomItems: SidebarNavItem[] = bottomGroups.map(toNavItem)

  // The art puts notifications and help in the topbar, but neither feature exists yet, so - like the
  // menu entries without a page - they are rendered disabled instead of as buttons that do nothing.
  const topbarActions: TopbarAction[] = [
    { disabled: true, icon: "bell-outline", key: "notifications", label: t("shell.notifications") },
    { disabled: true, icon: "help-outline", key: "help", label: t("shell.help") },
  ]

  // Signing out lives in the menu the user block opens.
  const userMenuItems: ActionMenuItem[] = [
    { icon: "logout-outline", key: "signOut", label: t("shell.signOut"), onClick: () => navigate(paths.signOut) },
  ]

  const breadcrumbTrail = breadcrumbByPath[location.pathname]
  const breadcrumbItems: BreadcrumbItem[] | undefined = breadcrumbTrail?.keys.map((key, index) => ({
    icon: index === 0 ? breadcrumbTrail.icon : undefined,
    key,
    label: navLabel(key),
  }))

  return (
    <AppShellWrapper>
      <Sidebar
        bottomItems={bottomItems}
        collapseLabel={t("shell.collapseMenu")}
        expandLabel={t("shell.expandMenu")}
        items={items}
        logoAlt={t("shell.logoAlt")}
        logoSrc={schoolFlowIcon}
        navLabel={t("shell.mainNavigation")}
        title="SchoolFlow360º"
      />

      {/* Covers every way out of a page with unsaved changes: the menu, the topbar (signing out) and
          the page's own links. */}
      <UnsavedChangesGuard>
        <AppShellBody>
          <Topbar
            actions={topbarActions}
            user={{ ...currentUserMock, role: t(`shell.roles.${currentUserMock.role}`) }}
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
