import styled from "styled-components"

import { colors, opacity, radius, spacing, typography } from "@/foundation"

export const FileUploadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const DropZone = styled.label`
  align-items: center;
  border-radius: ${radius.md};
  border: 1px dashed ${colors.neutral[300]};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: ${typography.fontFamily.sans};
  gap: ${spacing[8]};
  padding: ${spacing[24]};
  text-align: center;

  &:hover {
    border-color: ${colors.primary[500]};
  }

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`

export const HiddenFileInput = styled.input`
  height: 1px;
  overflow: hidden;
  position: absolute;
  width: 1px;
`
