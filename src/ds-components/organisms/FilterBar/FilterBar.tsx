import type { CSSProperties, ReactNode } from "react"
import { Children, isValidElement } from "react"

import { Button } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"

import {
  StyledFilterBar,
  StyledFilterBarActions,
  StyledFilterBarFilter,
  StyledFilterBarFilters,
  StyledFilterBarSearch,
} from "./FilterBar.styles"

export type FilterBarProps = {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  clearDisabled?: boolean
  clearLabel?: string
  label?: string
  searchLabel?: string
  searchPlaceholder?: string
  searchValue?: string
  style?: CSSProperties
  onClear?: () => void
  onSearchChange?: (value: string) => void
}

// The bar above a listing: a search field, the filter controls passed as children (e.g. Selects),
// a "clear filters" button and trailing actions (e.g. "Nova unidade"). Each part is optional: the
// search shows when onSearchChange is given, the clear button when both onClear and clearLabel are.
// The bar is a search landmark named by `label`. It filters nothing itself - it only reports what
// the user typed and picked, and the page applies it to its data. It owns no copy.
export const FilterBar = (props: FilterBarProps) => {
  const {
    actions,
    children,
    className,
    clearDisabled,
    clearLabel,
    label,
    onClear,
    onSearchChange,
    searchLabel,
    searchPlaceholder,
    searchValue,
    style,
  } = props

  const filters = Children.toArray(children)
  const hasClear = onClear !== undefined && clearLabel !== undefined

  return (
    <StyledFilterBar aria-label={label} className={className} role="search" style={style}>
      <StyledFilterBarFilters>
        {onSearchChange && (
          <StyledFilterBarSearch>
            <Input
              aria-label={searchLabel}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              startIcon="search-outline"
              type="search"
              value={searchValue ?? ""}
            />
          </StyledFilterBarSearch>
        )}

        {filters.map((filter, index) => (
          // Children.toArray gives every element a stable key; the index only covers text nodes.
          <StyledFilterBarFilter key={isValidElement(filter) ? filter.key : index}>{filter}</StyledFilterBarFilter>
        ))}
      </StyledFilterBarFilters>

      {(hasClear || actions) && (
        <StyledFilterBarActions>
          {hasClear && (
            <Button color="secondary" disabled={clearDisabled} onClick={onClear} variant="link">
              {clearLabel}
            </Button>
          )}
          {actions}
        </StyledFilterBarActions>
      )}
    </StyledFilterBar>
  )
}
