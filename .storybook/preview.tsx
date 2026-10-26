import type { Preview } from "@storybook/react-vite"
import { createGlobalStyle } from "styled-components"

import { colors } from "@/foundation"
import { i18n } from "@/i18n"

import GlobalStyle from "../src/styles/GlobalStyle"

// Components that translate their copy (AppShell) read the app's i18next instance, so it is set up
// here too and pinned to pt-BR: Storybook documents the design system in the product's language,
// whatever language the viewer's browser reports.
void i18n.changeLanguage("pt-BR")

const StorybookBackground = createGlobalStyle`
  body {
    background: ${colors.neutral[0]};
  }
`

const preview: Preview = {
  decorators: [
    (Story) => (
      <>
        <GlobalStyle />
        <StorybookBackground />
        <Story />
      </>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
