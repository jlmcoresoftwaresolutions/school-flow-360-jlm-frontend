import styled, { css } from "styled-components"

import { colors, motion, radius, shadows, spacing, typography } from "@/foundation"

export type TableAlign = "center" | "left" | "right"

const justifyContentMap: Record<TableAlign, string> = {
  center: "center",
  left: "flex-start",
  right: "flex-end",
}

export const TableWrapper = styled.div`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  box-shadow: ${shadows.xs};
  overflow-x: auto;
`

export const StyledTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`

export type StyledTableHeadCellProps = {
  $align: TableAlign
  $sortable: boolean
}

export const StyledTableHeadCell = styled.th<StyledTableHeadCellProps>`
  ${(props) => {
    const { $align, $sortable } = props

    return css`
      background: ${colors.neutral[50]};
      border-bottom: 1px solid ${colors.neutral[200]};
      color: ${colors.neutral[700]};
      font-size: ${typography.fontSize.sm}px;
      font-weight: ${typography.fontWeight.semibold};
      padding: ${spacing[12]} ${spacing[16]};
      text-align: ${$align};
      white-space: nowrap;
      ${$sortable &&
      css`
        cursor: pointer;
        user-select: none;
      `}
    `
  }}
`

export const TableHeadCellContent = styled.span<{ $align: TableAlign }>`
  align-items: center;
  display: inline-flex;
  gap: ${spacing[4]};
  justify-content: ${(props) => justifyContentMap[props.$align]};
  width: 100%;
`

export const TableRow = styled.tr<{ $striped: boolean }>`
  ${(props) =>
    props.$striped &&
    css`
      &:nth-child(even) {
        background: ${colors.neutral[50]};
      }
    `}

  transition: background ${motion.duration.fast} ${motion.easing.ease};

  &:hover {
    background: ${colors.neutral[100]};
  }
`

export type StyledTableCellProps = {
  $align: TableAlign
}

export const StyledTableCell = styled.td<StyledTableCellProps>`
  border-bottom: 1px solid ${colors.neutral[100]};
  color: ${colors.neutral[900]};
  font-size: ${typography.fontSize.sm}px;
  padding: ${spacing[12]} ${spacing[16]};
  text-align: ${(props) => props.$align};
`

export const TableEmptyCell = styled.td`
  color: ${colors.neutral[500]};
  padding: ${spacing[32]};
  text-align: center;
`

export const TableFooter = styled.div`
  align-items: center;
  border-top: 1px solid ${colors.neutral[200]};
  display: flex;
  justify-content: space-between;
  padding: ${spacing[12]} ${spacing[16]};
`
