import styled from "styled-components"

import { colors, motion, opacity, radius, spacing } from "@/foundation"

export const SwitchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const SwitchRow = styled.label`
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  gap: ${spacing[8]};
`

export const HiddenSwitchInput = styled.input`
  height: 1px;
  overflow: hidden;
  position: absolute;
  width: 1px;

  &:disabled {
    cursor: not-allowed;
  }
`

export const SwitchThumb = styled.span`
  background: ${colors.neutral[0]};
  border-radius: ${radius.full};
  height: ${spacing[16]};
  transition: transform ${motion.duration.fast} ${motion.easing.ease};
  width: ${spacing[16]};
`

export const SwitchTrack = styled.span`
  background: ${colors.neutral[300]};
  border-radius: ${radius.full};
  display: inline-flex;
  flex-shrink: 0;
  height: ${spacing[24]};
  padding: ${spacing[4]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};
  width: ${spacing[40]};

  ${HiddenSwitchInput}:checked + & {
    background: ${colors.primary[500]};
  }

  ${HiddenSwitchInput}:checked + & ${SwitchThumb} {
    transform: translateX(${spacing[16]});
  }

  ${HiddenSwitchInput}:disabled + & {
    opacity: ${opacity.disabled};
  }
`
