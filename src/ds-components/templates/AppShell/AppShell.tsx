import { Outlet, useLocation, useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Text } from "@/ds-components/atoms"
import type { SidebarNavSection } from "@/ds-components/organisms"
import { Sidebar } from "@/ds-components/organisms"

import { AppShellContent, AppShellWrapper } from "./AppShell.styles"

export type AppShellProps = {
  organizationName: string
  unitName: string
}

export const AppShell = (props: AppShellProps) => {
  const { organizationName, unitName } = props

  const location = useLocation()
  const navigate = useNavigate()

  const sections: SidebarNavSection[] = [
    {
      items: [
        {
          active: location.pathname === "/administracao/minha-escola",
          icon: "home-outline",
          key: "minha-escola",
          label: "Minha Escola",
          onClick: () => navigate("/administracao/minha-escola"),
        },
      ],
      key: "administracao",
      title: "Administração",
    },
  ]

  return (
    <AppShellWrapper>
      <Sidebar
        footer={
          <>
            <Text as="p" color="inverse" fontSize="sm" semibold>
              {organizationName}
            </Text>
            <Text as="p" color="muted" fontSize="xs">
              {unitName}
            </Text>
          </>
        }
        logoAlt="Ícone do SchoolFlow360"
        logoSrc={schoolFlowIcon}
        sections={sections}
        subtitle="JLM CORE"
        title="SchoolFlow360º"
      />

      <AppShellContent>
        <Outlet />
      </AppShellContent>
    </AppShellWrapper>
  )
}
