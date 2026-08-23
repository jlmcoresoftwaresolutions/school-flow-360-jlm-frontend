import type { Preview } from "@storybook/react-vite"
import { createGlobalStyle } from "styled-components"

import { colors } from "@/foundation"

import GlobalStyle from "../src/styles/GlobalStyle"

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
