import type { CSSProperties, MouseEvent, ReactNode, TransitionEvent } from "react"
import { Children, isValidElement, useState } from "react"

import { Button, Text } from "@/ds-components/atoms"
import { Collapsible, Input } from "@/ds-components/molecules"

import {
  StyledFilterBar,
  StyledFilterBarActionButtons,
  StyledFilterBarActions,
  StyledFilterBarBottom,
  StyledFilterBarClear,
  StyledFilterBarClearInner,
  StyledFilterBarFilter,
  StyledFilterBarFilters,
  StyledFilterBarHeader,
  StyledFilterBarSearch,
} from "./FilterBar.styles"

export type FilterBarProps = {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  clearLabel?: string
  collapseLabel?: string
  defaultOpen?: boolean
  expandLabel?: string
  hasActiveFilters?: boolean
  label?: string
  searchLabel?: string
  searchPlaceholder?: string
  searchValue?: string
  style?: CSSProperties
  title?: string
  onClear?: () => void
  onSearchChange?: (value: string) => void
}

// The bar above a listing, in three rows: the title ("Filtros" by default, `title` renames it) with a button
// on the right that expands or hides the filters, the filter controls passed as children (e.g. Selects)
// in a Collapsible, in at most four columns each filling its column, and the search field (to the left)
// with an outlined "clear filters" button and the actions (e.g. "Nova unidade") to the right, which stay
// visible while the filters are hidden. The search, the clear button and the filters are small, and so
// should be the actions. Each part is optional: the search shows when onSearchChange is given, the clear
// button when onClear and clearLabel are given and hasActiveFilters is true (the page says whether any
// filter or search is set; it slides in and out as that changes), the expand button when there are
// filters, and a row with nothing in it is not rendered. The filters start open (defaultOpen). The bar is
// a search landmark named by `label`.
// It filters nothing itself - it only reports what the user typed and picked, and the page applies it to
// its data. Its only copy is the pt-BR default of the title and of the expand and hide labels; pages
// pass the translated ones.
export const FilterBar = (props: FilterBarProps) => {
  const {
    actions,
    children,
    className,
    clearLabel,
    collapseLabel = "Ocultar filtros",
    defaultOpen = true,
    expandLabel = "Expandir filtros",
    hasActiveFilters = false,
    label,
    onClear,
    onSearchChange,
    searchLabel,
    searchPlaceholder,
    searchValue,
    style,
    title = "Filtros",
  } = props

  // Whether the clear button was visible when its last slide ended: it is only left unclipped once it is
  // shown and has finished sliding in, so its focus ring isn't cut off.
  const [settledClearVisible, setSettledClearVisible] = useState(hasActiveFilters)

  const filters = Children.toArray(children)
  const canClear = onClear !== undefined && clearLabel !== undefined
  const hasBottom = onSearchChange !== undefined || canClear || actions

  // The clear button hides itself once nothing is set, so the focus moves to the search, or to the button
  // that shows the filters, instead of being lost with it.
  const handleClear = (event: MouseEvent<HTMLButtonElement>) => {
    const bar = event.currentTarget.closest("[role='search']")

    onClear?.()
    bar?.querySelector<HTMLElement>("input[type='search'], [aria-expanded]")?.focus()
  }

  const handleClearTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setSettledClearVisible(hasActiveFilters)
  }

  return (
    <StyledFilterBar aria-label={label} className={className} defaultOpen={defaultOpen} role="search" style={style}>
      <StyledFilterBarHeader>
        <Text as="h2" fontSize="md" semibold>
          {title}
        </Text>

        {filters.length > 0 && (
          <Collapsible.Trigger>{({ open }) => (open ? collapseLabel : expandLabel)}</Collapsible.Trigger>
        )}
      </StyledFilterBarHeader>

      {filters.length > 0 && (
        <Collapsible.Content>
          <StyledFilterBarFilters>
            {filters.map((filter, index) => (
              // Children.toArray gives every element a stable key; the index only covers text nodes.
              <StyledFilterBarFilter key={isValidElement(filter) ? filter.key : index}>{filter}</StyledFilterBarFilter>
            ))}
          </StyledFilterBarFilters>
        </Collapsible.Content>
      )}

      {hasBottom && (
        <StyledFilterBarBottom>
          {onSearchChange && (
            <StyledFilterBarSearch>
              <Input
                aria-label={searchLabel}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                size="small"
                startIcon="search-outline"
                type="search"
                value={searchValue ?? ""}
              />
            </StyledFilterBarSearch>
          )}

          {(canClear || actions) && (
            <StyledFilterBarActions>
              {canClear && (
                <StyledFilterBarClear
                  $visible={hasActiveFilters}
                  inert={!hasActiveFilters}
                  onTransitionEnd={handleClearTransitionEnd}
                >
                  <StyledFilterBarClearInner
                    $clip={!(hasActiveFilters && settledClearVisible)}
                    $spaced={Boolean(actions)}
                  >
                    <Button color="secondary" onClick={handleClear} size="small" variant="outlined">
                      {clearLabel}
                    </Button>
                  </StyledFilterBarClearInner>
                </StyledFilterBarClear>
              )}
              {actions && <StyledFilterBarActionButtons>{actions}</StyledFilterBarActionButtons>}
            </StyledFilterBarActions>
          )}
        </StyledFilterBarBottom>
      )}
    </StyledFilterBar>
  )
}
