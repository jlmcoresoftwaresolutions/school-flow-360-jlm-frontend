import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"

import type { SidebarNavChild, SidebarNavItem, SidebarProps } from "./Sidebar"
import { Sidebar } from "./Sidebar"

const childrenOf = (...labels: string[]): SidebarNavChild[] => labels.map((label) => ({ key: label, label }))

// Sidebar is controlled: it never decides by itself which item is active, that comes from each
// item's active/onClick props (in the app, the router). These stories fake that with one piece of
// state so clicking an item visibly moves the highlight. A child's key is prefixed with its group's
// so two groups can share a child label without both lighting up.
const withActiveState = (
  list: SidebarNavItem[],
  activeKey: string,
  setActiveKey: (key: string) => void,
): SidebarNavItem[] =>
  list.map((item) => ({
    ...item,
    active: item.key === activeKey,
    children: item.children?.map((child) => {
      const childKey = `${item.key}/${child.key}`

      return { ...child, active: childKey === activeKey, onClick: () => setActiveKey(childKey) }
    }),
    onClick: item.children ? undefined : () => setActiveKey(item.key),
  }))

type StatefulSidebarProps = SidebarProps & {
  initialActive: string
}

const StatefulSidebar = (props: StatefulSidebarProps) => {
  const { bottomItems, initialActive, items: sidebarItems, ...rest } = props

  const [activeKey, setActiveKey] = useState(initialActive)

  return (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...rest}
        bottomItems={bottomItems && withActiveState(bottomItems, activeKey, setActiveKey)}
        items={withActiveState(sidebarItems, activeKey, setActiveKey)}
      />
    </div>
  )
}

const items: SidebarNavItem[] = [
  { icon: "home-outline", key: "inicio", label: "Início" },
  {
    children: childrenOf("Turmas", "Disciplinas", "Diário de classe", "Boletins"),
    icon: "school-outline",
    key: "academico",
    label: "Acadêmico",
  },
  {
    children: childrenOf("Mensalidades", "Cobranças", "Contratos", "Conciliação"),
    icon: "money-outline",
    key: "financeiro",
    label: "Financeiro",
  },
  {
    children: childrenOf("Comunicados", "Mensagens", "Notificações"),
    icon: "chat-outline",
    key: "comunicacao",
    label: "Comunicação",
  },
  {
    children: childrenOf("Relatórios acadêmicos", "Relatórios financeiros", "Exportações"),
    icon: "file-outline",
    key: "relatorios",
    label: "Relatórios",
  },
  {
    children: childrenOf("Minha Escola", "Unidades"),
    icon: "gear-outline",
    key: "administracao",
    label: "Administração",
  },
  {
    children: childrenOf("Lista de usuários", "Perfis e permissões", "Convites"),
    icon: "users-outline",
    key: "usuarios",
    label: "Usuários",
  },
  {
    children: childrenOf("Preferências", "Integrações", "Segurança"),
    icon: "gear-outline",
    key: "configuracoes",
    label: "Configurações",
  },
  {
    children: childrenOf("Acessos recentes", "Auditoria", "Sessões ativas"),
    icon: "history",
    key: "logs-de-acesso",
    label: "Logs de Acesso",
  },
]

const meta: Meta<typeof Sidebar> = {
  args: {
    bottomItems: [
      {
        children: childrenOf("Central de ajuda", "Contato com o suporte"),
        icon: "help-outline",
        key: "ajuda",
        label: "Ajuda",
      },
    ],
    items,
    logoAlt: "Ícone do SchoolFlow360",
    logoSrc: schoolFlowIcon,
    title: "SchoolFlow360º",
  },
  argTypes: {
    bottomItems: {
      control: false,
      description: "Optional items pinned below the scrollable menu, e.g. a help entry. Same shape as items.",
    },
    items: {
      control: false,
      description:
        "Menu entries. An item with children is a collapsible group; one without is a plain link. Each takes icon/label and optionally active, disabled and onClick.",
    },
    logoAlt: {
      control: "text",
      description: "alt text for the brand logo image.",
    },
    logoSrc: {
      control: "text",
      description: "Source of the brand logo image shown at the top of the sidebar.",
    },
    title: {
      control: "text",
      description: "Brand name rendered next to the logo.",
    },
  },
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Organisms/Sidebar",
}

export default meta

type Story = StoryObj<typeof Sidebar>

// Default rendering: clicking a leaf or a child moves the active highlight, and clicking a group header expands it (Minha Escola starts active, so Administração starts open)
export const Default: Story = {
  render: (args) => <StatefulSidebar {...args} initialActive="administracao/Minha Escola" />,
}

// Below the md breakpoint (768px) the sidebar is an icon-only rail with a button that opens it over the content - the viewport is set to a phone here, and the toolbar can resize it
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2" } },
  render: (args) => <StatefulSidebar {...args} initialActive="administracao/Minha Escola" />,
}

// With no active child every group starts collapsed; opening one group closes whichever other was open, so only one is ever open
export const CollapsedGroups: Story = {
  render: (args) => <StatefulSidebar {...args} initialActive="inicio" />,
}

// The disabled flag on entries whose page doesn't exist yet - dimmed and not clickable (open a group to see its disabled children)
export const DisabledItems: Story = {
  render: (args) => (
    <StatefulSidebar
      {...args}
      initialActive="inicio"
      items={items.map((item) => ({
        ...item,
        children: item.children?.map((child) => ({ ...child, disabled: true })),
        disabled: !item.children,
      }))}
    />
  ),
}

// Without bottomItems nothing is pinned under the menu
export const WithoutBottomItems: Story = {
  render: (args) => <StatefulSidebar {...args} bottomItems={undefined} initialActive="inicio" />,
}

// Many items overflow the available height and scroll within the nav (thin scrollbar flush to the sidebar's right edge), keeping the bottom item pinned
export const ManyItems: Story = {
  render: (args) => (
    <StatefulSidebar
      {...args}
      initialActive="item-0"
      items={Array.from({ length: 24 }, (_, index) => ({
        icon: "dashboard-outline" as const,
        key: `item-${index}`,
        label: `Item ${index + 1}`,
      }))}
    />
  ),
}
