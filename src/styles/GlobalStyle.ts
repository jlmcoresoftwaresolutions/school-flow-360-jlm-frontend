import { createGlobalStyle, keyframes } from "styled-components"

import appBackground from "@/assets/images/app-background.png"
import { typography } from "@/foundation"

// Oversizing the image and panning it lets the same blurry glow drift slowly across the
// viewport - motion.duration's tokens are all UI-transition scale (150-400ms), not ambient
// background scale, so this duration is deliberately its own hardcoded value.
const drift = keyframes`
  0% {
    background-position: 0% 30%;
  }
  50% {
    background-position: 100% 70%;
  }
  100% {
    background-position: 0% 30%;
  }
`

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    animation: ${drift} 40s ease-in-out infinite;
    background-attachment: fixed;
    background-image: url(${appBackground});
    background-repeat: no-repeat;
    background-size: 200% 200%;
    font-family: ${typography.fontFamily.sans};
    min-height: 100vh;
  }

  @media (prefers-reduced-motion: reduce) {
    body {
      animation: none;
    }
  }
`

export default GlobalStyle
