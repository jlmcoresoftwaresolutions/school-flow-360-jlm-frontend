import { Outlet, useLocation, useNavigate } from "react-router-dom"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import type { BreadcrumbItem } from "@/ds-components/molecules"
import { Breadcrumb } from "@/ds-components/molecules"
import type { SidebarNavChild, SidebarNavItem, TopbarAction } from "@/ds-components/organisms"
import { Sidebar, Topbar } from "@/ds-components/organisms"

import { AppShellBody, AppShellContent, AppShellWrapper } from "./AppShell.styles"

const minhaEscolaPath = "/administracao/minha-escola"

// The trail shown in the topbar for each page; a route not listed here shows no breadcrumb. The group
// ("Administração") has no page of its own, so it is plain text rather than a link.
const breadcrumbByPath: Record<string, BreadcrumbItem[]> = {
  [minhaEscolaPath]: [
    { key: "administracao", label: "Administração" },
    { key: "minha-escola", label: "Minha Escola" },
  ],
}

// The art puts notifications and help in the topbar, but neither feature exists yet, so - like the
// menu entries without a page - they are rendered disabled instead of as buttons that do nothing.
const topbarActions: TopbarAction[] = [
  { disabled: true, icon: "bell-outline", key: "notificacoes", label: "Notificações" },
  { disabled: true, icon: "help-outline", key: "ajuda", label: "Ajuda" },
]

const placeholderChildren = (...labels: string[]): SidebarNavChild[] =>
  labels.map((label) => ({ disabled: true, key: label, label }))

export const AppShell = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // The top-level entries mirror the menu in the P1 "Especificação Visual Final"; the art doesn't
  // specify their children, so those are plausible placeholders. Only Minha Escola has a page so
  // far, so every other entry is rendered disabled instead of as a link that goes nowhere -
  // enabling one is just adding its onClick once its page exists.
  const items: SidebarNavItem[] = [
    { disabled: true, icon: "home-outline", key: "inicio", label: "Início" },
    {
      children: placeholderChildren("Turmas", "Disciplinas", "Diário de classe", "Boletins"),
      icon: "school-outline",
      key: "academico",
      label: "Acadêmico",
    },
    {
      children: placeholderChildren("Mensalidades", "Cobranças", "Contratos", "Conciliação"),
      icon: "money-outline",
      key: "financeiro",
      label: "Financeiro",
    },
    {
      children: placeholderChildren("Comunicados", "Mensagens", "Notificações"),
      icon: "chat-outline",
      key: "comunicacao",
      label: "Comunicação",
    },
    {
      children: placeholderChildren("Relatórios acadêmicos", "Relatórios financeiros", "Exportações"),
      icon: "file-outline",
      key: "relatorios",
      label: "Relatórios",
    },
    {
      children: [
        {
          active: location.pathname === minhaEscolaPath,
          key: "minha-escola",
          label: "Minha Escola",
          onClick: () => navigate(minhaEscolaPath),
        },
        ...placeholderChildren("Unidades"),
      ],
      icon: "gear-outline",
      key: "administracao",
      label: "Administração",
    },
    {
      children: placeholderChildren("Lista de usuários", "Perfis e permissões", "Convites"),
      icon: "users-outline",
      key: "usuarios",
      label: "Usuários",
    },
    {
      children: placeholderChildren("Preferências", "Integrações", "Segurança"),
      icon: "gear-outline",
      key: "configuracoes",
      label: "Configurações",
    },
    {
      children: placeholderChildren("Acessos recentes", "Auditoria", "Sessões ativas"),
      icon: "history",
      key: "logs-de-acesso",
      label: "Logs de Acesso",
    },
  ]

  const breadcrumbItems = breadcrumbByPath[location.pathname]

  const bottomItems: SidebarNavItem[] = [
    {
      children: placeholderChildren("Central de ajuda", "Contato com o suporte"),
      icon: "help-outline",
      key: "ajuda",
      label: "Ajuda",
    },
  ]

  return (
    <AppShellWrapper>
      <Sidebar
        bottomItems={bottomItems}
        items={items}
        logoAlt="Ícone do SchoolFlow360"
        logoSrc={schoolFlowIcon}
        title="SchoolFlow360º"
      />

      <AppShellBody>
        <Topbar actions={topbarActions}>
          {breadcrumbItems && <Breadcrumb items={breadcrumbItems} label="Você está em" />}
        </Topbar>

        <AppShellContent>
          <Outlet />
        </AppShellContent>
      </AppShellBody>
    </AppShellWrapper>
  )
}
