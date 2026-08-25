import styled, { keyframes } from "styled-components"

import { colors, motion, opacity, radius, semanticColors, shadows, spacing, typography, zIndex } from "@/foundation"

const slideInLeft = keyframes`
  from {
    transform: translate3d(-110%, 0, 0);
    visibility: visible;
  }
  to {
    transform: translate3d(0, 0, 0);
  }
`

const slideInRight = keyframes`
  from {
    transform: translate3d(110%, 0, 0);
    visibility: visible;
  }
  to {
    transform: translate3d(0, 0, 0);
  }
`

const slideInDown = keyframes`
  from {
    transform: translate3d(0, -110%, 0);
    visibility: visible;
  }
  to {
    transform: translate3d(0, 0, 0);
  }
`

const slideInUp = keyframes`
  from {
    transform: translate3d(0, 110%, 0);
    visibility: visible;
  }
  to {
    transform: translate3d(0, 0, 0);
  }
`

const slideOutLeft = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-110%, 0, 0);
    visibility: hidden;
  }
`

const slideOutRight = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(110%, 0, 0);
    visibility: hidden;
  }
`

const slideOutUp = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, -110%, 0);
    visibility: hidden;
  }
`

const slideOutDown = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, 110%, 0);
    visibility: hidden;
  }
`

const trackProgress = keyframes`
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
`

// react-toastify's own stylesheet (dist/ReactToastify.css) is deliberately not imported, the same
// call made for react-datepicker in DateInput: it hardcodes its own colors/spacing/shadows, none
// of which come from src/foundation. Toast.tsx renders via react-toastify/unstyled instead (an
// entry point the library ships specifically for this), which keeps every Toastify__ class name
// and behavior but never injects that default stylesheet - everything below rebuilds only the
// classes that matter from tokens. theme is fixed to "colored" and transition to Slide in
// Toast.tsx, since this file only styles that exact combination.
//
// This wraps ToastContainer as a plain child rather than styled(ToastContainer): styled-components
// reserves the "theme" prop name for its own ThemeProvider context, so passing theme="colored"
// through styled(ToastContainer) gets swallowed before it reaches react-toastify - the toast type
// icons silently fell back to react-toastify's unset CSS-variable colors instead of following the
// text color. A wrapping div sidesteps that collision entirely; position: fixed on the library's
// own container still positions against the viewport regardless of this extra nesting.
export const StyledToastWrapper = styled.div`
  .Toastify__toast-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${spacing[16]};
    padding: ${spacing[16]};
    position: fixed;
    width: fit-content;
    z-index: ${zIndex.toast};
  }

  .Toastify__toast-container--top-left {
    left: 0;
    top: 0;
  }

  .Toastify__toast-container--top-center {
    left: 50%;
    top: 0;
    transform: translateX(-50%);
  }

  .Toastify__toast-container--top-right {
    align-items: flex-end;
    right: 0;
    top: 0;
  }

  .Toastify__toast-container--bottom-left {
    bottom: 0;
    left: 0;
  }

  .Toastify__toast-container--bottom-center {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .Toastify__toast-container--bottom-right {
    align-items: flex-end;
    bottom: 0;
    right: 0;
  }

  .Toastify__toast {
    align-items: center;
    border-radius: ${radius.lg};
    box-shadow: ${shadows.lg};
    color: ${colors.neutral[0]};
    cursor: default;
    display: flex;
    font-family: ${typography.fontFamily.sans};
    font-size: ${typography.fontSize.sm}px;
    max-width: calc(100vw - ${spacing[32]});
    padding: ${spacing[16]};
    position: relative;
    width: 360px;
    word-break: break-word;
  }

  .Toastify__toast--close-on-click {
    cursor: pointer;
  }

  .Toastify__toast--default {
    background: ${colors.neutral[0]};
    color: ${colors.neutral[900]};
  }

  .Toastify__toast--success {
    background: ${semanticColors.success};
  }

  .Toastify__toast--info {
    background: ${semanticColors.info};
  }

  .Toastify__toast--warning {
    background: ${semanticColors.warning};
  }

  .Toastify__toast--error {
    background: ${semanticColors.danger};
  }

  .Toastify__toast-icon {
    display: flex;
    flex-shrink: 0;
    height: ${spacing[20]};
    margin-inline-end: ${spacing[8]};
    width: ${spacing[20]};
  }

  .Toastify__close-button {
    align-items: center;
    background: transparent;
    border: none;
    color: currentColor;
    cursor: pointer;
    display: flex;
    justify-content: center;
    opacity: ${opacity.overlay};
    padding: 0;
    position: absolute;
    right: ${spacing[8]};
    top: ${spacing[8]};
    transition: opacity ${motion.duration.fast} ${motion.easing.ease};
  }

  .Toastify__close-button:hover,
  .Toastify__close-button:focus {
    opacity: ${opacity.visible};
  }

  .Toastify__close-button > svg {
    fill: currentColor;
    height: ${spacing[12]};
    width: ${spacing[12]};
  }

  .Toastify__progress-bar--wrp {
    bottom: 0;
    height: ${spacing[4]};
    left: 0;
    overflow: hidden;
    position: absolute;
    width: 100%;
  }

  .Toastify__progress-bar {
    background: currentColor;
    height: 100%;
    opacity: ${opacity.overlay};
    transform-origin: left;
  }

  .Toastify__progress-bar--animated {
    animation: ${trackProgress} linear 1 forwards;
  }

  .Toastify__progress-bar--controlled {
    transition: transform ${motion.duration.normal} ${motion.easing.ease};
  }

  .Toastify__slide-enter--top-left,
  .Toastify__slide-enter--bottom-left {
    animation: ${slideInLeft} ${motion.duration.slow} ${motion.easing.out};
    animation-fill-mode: both;
  }

  .Toastify__slide-enter--top-right,
  .Toastify__slide-enter--bottom-right {
    animation: ${slideInRight} ${motion.duration.slow} ${motion.easing.out};
    animation-fill-mode: both;
  }

  .Toastify__slide-enter--top-center {
    animation: ${slideInDown} ${motion.duration.slow} ${motion.easing.out};
    animation-fill-mode: both;
  }

  .Toastify__slide-enter--bottom-center {
    animation: ${slideInUp} ${motion.duration.slow} ${motion.easing.out};
    animation-fill-mode: both;
  }

  .Toastify__slide-exit--top-left,
  .Toastify__slide-exit--bottom-left {
    animation: ${slideOutLeft} ${motion.duration.normal} ${motion.easing.in};
    animation-fill-mode: both;
  }

  .Toastify__slide-exit--top-right,
  .Toastify__slide-exit--bottom-right {
    animation: ${slideOutRight} ${motion.duration.normal} ${motion.easing.in};
    animation-fill-mode: both;
  }

  .Toastify__slide-exit--top-center {
    animation: ${slideOutUp} ${motion.duration.normal} ${motion.easing.in};
    animation-fill-mode: both;
  }

  .Toastify__slide-exit--bottom-center {
    animation: ${slideOutDown} ${motion.duration.normal} ${motion.easing.in};
    animation-fill-mode: both;
  }
`
