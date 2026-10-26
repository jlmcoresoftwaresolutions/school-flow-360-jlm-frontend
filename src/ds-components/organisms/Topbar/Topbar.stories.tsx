import type { Meta, StoryObj } from "@storybook/react-vite"

import { ActionMenu, Breadcrumb } from "../../molecules"
import { Topbar } from "./Topbar"

// A self-contained placeholder photo, so the story doesn't depend on an external image host.
const photo = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#4f46e5"/><circle cx="40" cy="32" r="14" fill="#c7d2fe"/><rect x="14" y="52" width="52" height="40" rx="20" fill="#c7d2fe"/></svg>',
)}`

const meta: Meta<typeof Topbar> = {
  args: {
    actions: [
      { icon: "bell-outline", key: "notificacoes", label: "Notificações" },
      { icon: "help-outline", key: "ajuda", label: "Ajuda" },
    ],
    children: (
      <Breadcrumb
        items={[
          { key: "administracao", label: "Administração" },
          { key: "minha-escola", label: "Minha Escola" },
        ]}
        label="Você está em"
      />
    ),
    user: { name: "Maria da Silva", role: "Diretora" },
  },
  argTypes: {
    actions: {
      control: "object",
      description:
        "Icon-only buttons on the trailing side: key, icon, label (accessible name and tooltip) and optionally disabled and onClick.",
    },
    children: {
      control: false,
      description: "Content of the leading side, typically a Breadcrumb.",
    },
    extraActions: {
      control: false,
      description:
        "Content placed after the icon actions, for controls that are more than a button, e.g. an ActionMenu used as a language switcher.",
    },
    user: {
      control: "object",
      description:
        "The signed-in user: name, and optionally role and avatarSrc. Without a photo the avatar shows the name's initials.",
    },
  },
  component: Topbar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Organisms/Topbar",
}

export default meta

type Story = StoryObj<typeof Topbar>

// Default rendering: breadcrumb on the leading side, icon actions and the signed-in user on the trailing side
export const Default: Story = {}

// A user with a photo, shown instead of the initials
export const WithAvatarPhoto: Story = {
  args: {
    user: { avatarSrc: photo, name: "Maria da Silva", role: "Diretora" },
  },
}

// Only the leading content, with no actions and no user
export const BreadcrumbOnly: Story = {
  args: {
    actions: undefined,
    user: undefined,
  },
}

// A disabled action, for a feature that isn't available yet
export const WithDisabledAction: Story = {
  args: {
    actions: [
      { disabled: true, icon: "bell-outline", key: "notificacoes", label: "Notificações" },
      { icon: "help-outline", key: "ajuda", label: "Ajuda" },
    ],
  },
}

// The extraActions prop holding a language switcher menu next to the icon actions
export const WithExtraActions: Story = {
  args: {
    extraActions: (
      <ActionMenu
        items={[
          { checked: true, key: "pt-BR", label: "Português (Brasil)" },
          { checked: false, key: "en", label: "English" },
        ]}
        triggerIcon="language"
        triggerLabel="Alterar idioma"
      />
    ),
  },
}
