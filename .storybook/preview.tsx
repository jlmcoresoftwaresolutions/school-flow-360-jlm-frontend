import type { Preview } from "@storybook/react-vite"
import { createGlobalStyle } from "styled-components"

import { colors, spacing } from "@/foundation"
import { i18n } from "@/i18n"

import GlobalStyle from "../src/styles/GlobalStyle"
import { SchoolColorTheme } from "./SchoolColorTheme"

// Components that translate their copy (AppShell) read the app's i18next instance, so it is set up
// here too and pinned to pt-BR: Storybook documents the design system in the product's language,
// whatever language the viewer's browser reports.
void i18n.changeLanguage("pt-BR")

// The "padded" layout's spacing moves from the body to the story's root. A select's open menu blocks the
// page's scroll by writing an inline padding-right on the body (react-select's scroll lock), which wiped
// the layout's right padding and pushed the story to the edge while the menu was open.
const StorybookBackground = createGlobalStyle`
  body {
    background: ${colors.neutral[0]};
  }

  body.sb-show-main.sb-main-padded {
    padding: 0;
  }

  body.sb-show-main.sb-main-padded #storybook-root {
    padding: ${spacing[16]};
  }
`

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <SchoolColorTheme sample={String(context.globals.schoolColor ?? "product")}>
        <GlobalStyle />
        <StorybookBackground />
        <Story />
      </SchoolColorTheme>
    ),
  ],
  globalTypes: {
    schoolColor: {
      description: "The school's colors the components are painted with",
      toolbar: {
        dynamicTitle: true,
        icon: "paintbrush",
        items: [
          { title: "Produto (SchoolFlow360º)", value: "product" },
          { title: "Vermelho, secundária amarela", value: "red" },
          { title: "Verde, sem secundária", value: "green" },
          { title: "Amarelo (escurecido pelo contraste)", value: "yellow" },
        ],
        title: "Cor da escola",
      },
    },
  },
  initialGlobals: {
    schoolColor: "product",
  },
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
