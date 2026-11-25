import { css } from "styled-components"

import libraryPhoto from "@/assets/images/login-library.webp"
import { opacity } from "@/foundation"

// The photograph of a library over the animated background of every screen before signing in (login,
// password recovery and reset, invitation and contract acceptance, password change, unknown or inactive
// school). It supplies light and detail only: shown in grayscale and blended by luminosity with the
// backdrop below (GlobalStyle's body), it takes the school's hues, so a red school gets a red library
// and a green one a green library from the same file. It sits fixed behind the page, and the page's
// content, positioned after it, paints above it; clicks go through it. The filter values have no token.
export const photoBackdrop = css`
  position: relative;

  &::before {
    background-image: url(${libraryPhoto});
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    content: "";
    filter: grayscale(1) contrast(1.15) brightness(0.78);
    inset: 0;
    mix-blend-mode: luminosity;
    opacity: ${opacity.texture};
    pointer-events: none;
    position: fixed;
  }

  > * {
    position: relative;
  }
`
