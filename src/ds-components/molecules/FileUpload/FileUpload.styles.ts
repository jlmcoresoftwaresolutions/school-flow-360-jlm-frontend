import styled from "styled-components"

import { colors, motion, opacity, radius, spacing, typography } from "@/foundation"

export const FileUploadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export type DropZoneProps = {
  $hasError?: boolean
}

// A div, not a label: the title is already the input's <label>, and a second one would make the
// accessible name read both. Clicks reach the input because it covers the whole zone (see below).
export const DropZone = styled.div<DropZoneProps>`
  align-items: center;
  border-radius: ${radius.md};
  border: 1px dashed ${(props) => (props.$hasError ? colors.danger[500] : colors.neutral[300])};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: ${typography.fontFamily.sans};
  gap: ${spacing[8]};
  padding: ${spacing[24]};
  position: relative;
  text-align: center;
  transition: border-color ${motion.duration.normal} ${motion.easing.ease};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    border-color: ${(props) => (props.$hasError ? colors.danger[500] : colors.primary[500])};
  }

  // The real input is invisible, so its keyboard focus is shown on the zone instead.
  &:has(input:focus-visible) {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`

// Stretched transparently over the whole zone, so a click anywhere on it opens the file picker
// (and a drop onto it reaches the input) without the zone having to be a label.
export const HiddenFileInput = styled.input`
  cursor: pointer;
  inset: 0;
  opacity: ${opacity.hidden};
  position: absolute;

  &:disabled {
    cursor: not-allowed;
  }
`
