import styled, { css } from "styled-components"

import { colors, motion, shadows, spacing, typography } from "@/foundation"

export const TextareaWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// The line under the textarea when it has a counter: the helper text or error on the left, taking the
// room the counter leaves, and the counter on the right, centered on that line's height. The gap keeps
// a long message, which wraps, from touching the counter.
export const TextareaFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

export const MessageSlot = styled.div`
  flex: 1;
  min-width: 0;
`

export type CharacterCounterProps = {
  $atLimit: boolean
  $visible: boolean
}

// "x/y". It is always laid out, hidden while the textarea has no focus, so the line (and the room the
// message has beside it) doesn't change when the focus comes and goes.
export const CharacterCounter = styled.span<CharacterCounterProps>`
  color: ${(props) => (props.$atLimit ? colors.danger[700] : colors.neutral[700])};
  flex-shrink: 0;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.xs}px;
  line-height: ${typography.lineHeight.xs};
  margin-left: auto;
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  white-space: nowrap;
`

export type StyledTextareaProps = {
  $borderRadius: string
  $elevated?: boolean
  $hasError?: boolean
}

export const StyledTextarea = styled.textarea<StyledTextareaProps>`
  ${(props) => {
    const { $borderRadius, $elevated, $hasError } = props

    return css`
      background: ${colors.neutral[0]};
      border-radius: ${$borderRadius};
      border: 1px solid ${$hasError ? colors.danger[500] : colors.neutral[300]};
      box-shadow: ${$elevated ? shadows.sm : shadows.none};
      color: ${colors.neutral[900]};
      font-family: ${typography.fontFamily.sans};
      font-size: ${typography.fontSize.md}px;
      min-height: ${spacing[80]};
      padding: ${spacing[12]};
      resize: none;
      width: 100%;
      transition: border-color ${motion.duration.normal} ${motion.easing.ease};

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      &::placeholder {
        color: ${colors.neutral[500]};
      }

      &:focus {
        border-color: ${$hasError ? colors.danger[500] : colors.primary[500]};
        outline: none;
      }

      &:disabled {
        background: ${colors.neutral[50]};
        color: ${colors.neutral[500]};
        cursor: not-allowed;
      }
    `
  }}
`
