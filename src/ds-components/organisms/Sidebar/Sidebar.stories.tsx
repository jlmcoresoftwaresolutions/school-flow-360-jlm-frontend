import type { Meta, StoryObj } from "@storybook/react-vite"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Text } from "@/ds-components/atoms"

import type { SidebarNavSection } from "./Sidebar"
import { Sidebar } from "./Sidebar"

const sections: SidebarNavSection[] = [
  {
    items: [
      { active: true, icon: "home-outline", key: "minha-escola", label: "Minha Escola" },
      { icon: "users-outline", key: "usuarios", label: "Usuários" },
    ],
    key: "administracao",
    title: "Administração",
  },
  {
    items: [
      { icon: "users-outline", key: "alunos", label: "Alunos" },
      { icon: "user-outline", key: "responsaveis", label: "Responsáveis" },
    ],
    key: "pessoas",
    title: "Pessoas",
  },
]

const meta: Meta<typeof Sidebar> = {
  args: {
    logoAlt: "Ícone do SchoolFlow360",
    logoSrc: schoolFlowIcon,
    sections,
    subtitle: "JLM CORE",
    title: "SchoolFlow360º",
  },
  argTypes: {
    footer: {
      control: false,
      description: "Optional content rendered below the nav, separated by a divider - e.g. current org/unit.",
    },
    logoAlt: {
      control: "text",
      description: "alt text for the brand logo image.",
    },
    logoSrc: {
      control: "text",
      description: "Source of the brand logo image shown at the top of the sidebar.",
    },
    sections: {
      control: false,
      description: "Nav sections, each an optional title plus a list of items with icon/label/active/onClick.",
    },
    subtitle: {
      control: "text",
      description: "Optional line rendered under the title, e.g. a product/company tagline.",
    },
    title: {
      control: "text",
      description: "Brand name rendered next to the logo.",
    },
  },
  component: Sidebar,
  tags: ["autodocs"],
  title: "Organisms/Sidebar",
}

export default meta

type Story = StoryObj<typeof Sidebar>

// Default rendering with two nav sections and one active item
export const Default: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar {...args} />
    </div>
  ),
}

// The footer prop rendering the current organization/unit context below the nav
export const WithFooter: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...args}
        footer={
          <>
            <Text as="p" color="inverse" fontSize="sm" semibold>
              Colégio Horizonte
            </Text>
            <Text as="p" color="muted" fontSize="xs">
              Unidade Aldeota
            </Text>
          </>
        }
      />
    </div>
  ),
}

// Omitting subtitle, showing only the brand title next to the logo
export const WithoutSubtitle: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar {...args} subtitle={undefined} />
    </div>
  ),
}

// Many sections/items overflow the available height and scroll within the nav, rather than the page
export const ManySections: Story = {
  render: (args) => (
    <div style={{ height: "100vh" }}>
      <Sidebar
        {...args}
        sections={Array.from({ length: 6 }, (_, sectionIndex) => ({
          items: Array.from({ length: 4 }, (_, itemIndex) => ({
            icon: "dashboard-outline" as const,
            key: `s${sectionIndex}-i${itemIndex}`,
            label: `Item ${sectionIndex + 1}.${itemIndex + 1}`,
          })),
          key: `s${sectionIndex}`,
          title: `Seção ${sectionIndex + 1}`,
        }))}
      />
    </div>
  ),
}
