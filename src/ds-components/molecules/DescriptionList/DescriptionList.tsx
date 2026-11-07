import type { CSSProperties, ReactNode } from "react"

import type { DescriptionListColumns } from "./DescriptionList.styles"
import {
  StyledDescriptionDetails,
  StyledDescriptionItem,
  StyledDescriptionList,
  StyledDescriptionTerm,
} from "./DescriptionList.styles"

export type DescriptionListItem = {
  key: string
  label: string
  fullWidth?: boolean
  value?: ReactNode
}

export type DescriptionListProps = {
  items: DescriptionListItem[]
  className?: string
  columns?: DescriptionListColumns
  emptyValue?: string
  style?: CSSProperties
}

const isEmptyValue = (value: ReactNode) =>
  value === undefined || value === null || value === false || (typeof value === "string" && value.trim() === "")

// Read-only information as label/value pairs (a <dl>), laid out in a grid: one column on a narrow
// screen, `columns` (2 by default) from md up. An item with `fullWidth` takes the whole row (e.g. an
// address or a note). A missing value shows `emptyValue` instead of a blank, so "not filled in" reads
// as such. It owns no copy beyond that default, in pt-BR.
export const DescriptionList = (props: DescriptionListProps) => {
  const { className, columns = 2, emptyValue = "Não informado", items, style } = props

  return (
    <StyledDescriptionList $columns={columns} className={className} style={style}>
      {items.map((item) => {
        const isEmpty = isEmptyValue(item.value)

        return (
          <StyledDescriptionItem $fullWidth={Boolean(item.fullWidth)} key={item.key}>
            <StyledDescriptionTerm>{item.label}</StyledDescriptionTerm>
            <StyledDescriptionDetails $empty={isEmpty}>{isEmpty ? emptyValue : item.value}</StyledDescriptionDetails>
          </StyledDescriptionItem>
        )
      })}
    </StyledDescriptionList>
  )
}
