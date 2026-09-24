import type { Meta, StoryObj } from "@storybook/react-vite"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"

import type { SidebarNavChild, SidebarNavItem } from "./Sidebar"
import { Sidebar } from "./Sidebar"

const childrenOf = (...labels: string[]): SidebarNavChild[] => labels.map((label) => ({ key: label, label }))

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
    children: [{ active: true, key: "minha-escola", label: "Minha Escola" }, ...childrenOf("Unidades")],
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

// Default rendering: the P1 menu, with the Administração group open because its child Minha Escola is the current page
export const Default: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar {...args} />
    </div>
  ),
}

// With no active child every group starts collapsed, and each one opens when its header is clicked
export const CollapsedGroups: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...args}
        items={items.map((item) => ({
          ...item,
          children: item.children?.map((child) => ({ ...child, active: false })),
        }))}
      />
    </div>
  ),
}

// The disabled flag on entries whose page doesn't exist yet - dimmed and not clickable (open a group to see its disabled children)
export const DisabledItems: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...args}
        items={items.map((item) => ({
          ...item,
          children: item.children?.map((child) => ({ ...child, disabled: true })),
          disabled: !item.children,
        }))}
      />
    </div>
  ),
}

// Without bottomItems nothing is pinned under the menu
export const WithoutBottomItems: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar {...args} bottomItems={undefined} />
    </div>
  ),
}

// Many items overflow the available height and scroll within the nav (thin scrollbar flush to the sidebar's right edge), keeping the bottom item pinned
export const ManyItems: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...args}
        items={Array.from({ length: 24 }, (_, index) => ({
          icon: "dashboard-outline" as const,
          key: `item-${index}`,
          label: `Item ${index + 1}`,
        }))}
      />
    </div>
  ),
}
