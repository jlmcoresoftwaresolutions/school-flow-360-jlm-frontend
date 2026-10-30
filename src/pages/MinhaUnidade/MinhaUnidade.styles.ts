import styled from "styled-components"

import { colors, radius, spacing } from "@/foundation"

export const CardHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: ${spacing[16]};
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
`

export const FormActions = styled.div`
  display: flex;
  gap: ${spacing[12]};
  justify-content: flex-end;
  margin-top: ${spacing[8]};
`

export const ReadOnlyGrid = styled.div`
  display: grid;
  gap: ${spacing[16]};
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`

export const ReadOnlyField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const ColorPreviewRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

export type StyledColorSwatchProps = {
  $color: string
}

export const ColorSwatch = styled.span<StyledColorSwatchProps>`
  background: ${(props) => props.$color};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.sm};
  display: inline-block;
  height: ${spacing[20]};
  width: ${spacing[20]};
`
