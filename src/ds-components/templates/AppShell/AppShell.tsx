import { useTranslation } from "react-i18next"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { LanguageSwitcher } from "@/components"
import type { BreadcrumbItem } from "@/ds-components/molecules"
import { Breadcrumb } from "@/ds-components/molecules"
import type { SidebarNavChild, SidebarNavItem, TopbarAction } from "@/ds-components/organisms"
import { Sidebar, Topbar } from "@/ds-components/organisms"
import type { TranslationResource } from "@/i18n/locales/ptBR"

import { AppShellBody, AppShellContent, AppShellWrapper } from "./AppShell.styles"

type NavKey = keyof TranslationResource["shell"]["nav"]

const minhaEscolaPath = "/administracao/minha-escola"

// The trail shown in the topbar for each page, as nav keys; a route not listed here shows no
// breadcrumb. The group (Administração) has no page of its own, so it is plain text, not a link.
const breadcrumbByPath: Record<string, NavKey[]> = {
  [minhaEscolaPath]: ["administration", "minhaEscola"],
}

// This template is the app's own shell rather than a reusable piece, so - like the pages - it
// translates its copy instead of taking it through props. Nav keys double as React keys, so they
// stay stable whatever the language.
export const AppShell = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const { t } = useTranslation()

  const navLabel = (key: NavKey) => t(`shell.nav.${key}`)

  const placeholderChildren = (...keys: NavKey[]): SidebarNavChild[] =>
    keys.map((key) => ({ disabled: true, key, label: navLabel(key) }))

  // The top-level entries mirror the menu in the P1 "Especificação Visual Final"; the art doesn't
  // specify their children, so those are plausible placeholders. Only Minha Escola has a page so
  // far, so every other entry is rendered disabled instead of as a link that goes nowhere -
  // enabling one is just adding its onClick once its page exists.
  const items: SidebarNavItem[] = [
    { disabled: true, icon: "home-outline", key: "home", label: navLabel("home") },
    {
      children: placeholderChildren("classes", "subjects", "classDiary", "reportCards"),
      icon: "school-outline",
      key: "academic",
      label: navLabel("academic"),
    },
    {
      children: placeholderChildren("tuition", "billing", "contracts", "reconciliation"),
      icon: "money-outline",
      key: "finance",
      label: navLabel("finance"),
    },
    {
      children: placeholderChildren("notices", "messages", "notifications"),
      icon: "chat-outline",
      key: "communication",
      label: navLabel("communication"),
    },
    {
      children: placeholderChildren("academicReports", "financialReports", "exports"),
      icon: "file-outline",
      key: "reports",
      label: navLabel("reports"),
    },
    {
      children: [
        {
          active: location.pathname === minhaEscolaPath,
          key: "minhaEscola",
          label: navLabel("minhaEscola"),
          onClick: () => navigate(minhaEscolaPath),
        },
        ...placeholderChildren("units"),
      ],
      icon: "gear-outline",
      key: "administration",
      label: navLabel("administration"),
    },
    {
      children: placeholderChildren("userList", "profilesAndPermissions", "invites"),
      icon: "users-outline",
      key: "users",
      label: navLabel("users"),
    },
    {
      children: placeholderChildren("preferences", "integrations", "security"),
      icon: "gear-outline",
      key: "settings",
      label: navLabel("settings"),
    },
    {
      children: placeholderChildren("recentAccess", "audit", "activeSessions"),
      icon: "history",
      key: "accessLogs",
      label: navLabel("accessLogs"),
    },
  ]

  const bottomItems: SidebarNavItem[] = [
    {
      children: placeholderChildren("helpCenter", "contactSupport"),
      icon: "help-outline",
      key: "help",
      label: navLabel("help"),
    },
  ]

  // The art puts notifications and help in the topbar, but neither feature exists yet, so - like the
  // menu entries without a page - they are rendered disabled instead of as buttons that do nothing.
  const topbarActions: TopbarAction[] = [
    { disabled: true, icon: "bell-outline", key: "notifications", label: t("shell.notifications") },
    { disabled: true, icon: "help-outline", key: "help", label: t("shell.help") },
  ]

  const breadcrumbItems: BreadcrumbItem[] | undefined = breadcrumbByPath[location.pathname]?.map((key) => ({
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

      <AppShellBody>
        <Topbar actions={topbarActions} extraActions={<LanguageSwitcher label={t("common.changeLanguage")} />}>
          {breadcrumbItems && <Breadcrumb items={breadcrumbItems} label={t("shell.breadcrumbLabel")} />}
        </Topbar>

        <AppShellContent>
          <Outlet />
        </AppShellContent>
      </AppShellBody>
    </AppShellWrapper>
  )
}
