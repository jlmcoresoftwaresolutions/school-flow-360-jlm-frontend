import type { CSSProperties } from "react"

import { Icon } from "@/ds-components/atoms"

import { StyledPaginationButton, StyledPaginationEllipsis, StyledPaginationList } from "./Pagination.styles"

export type PaginationProps = {
  nextLabel: string
  page: number
  previousLabel: string
  totalPages: number
  className?: string
  label?: string
  siblingCount?: number
  style?: CSSProperties
  onChange: (page: number) => void
  pageLabel?: (page: number) => string
}

type PaginationEntry = number | "end-ellipsis" | "start-ellipsis"

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, index) => start + index)

// The page numbers to show: always the first and the last, the current one with `siblingCount`
// neighbours on each side, and an ellipsis for each gap. A gap of a single page shows that page
// instead of an ellipsis (an ellipsis standing for one number saves nothing), so the entry count
// stays constant as the current page moves and the buttons don't jump around under the cursor.
const getEntries = (page: number, totalPages: number, siblingCount: number): PaginationEntry[] => {
  const maxEntries = siblingCount * 2 + 5

  if (totalPages <= maxEntries) return range(1, totalPages)

  const left = Math.max(page - siblingCount, 1)
  const right = Math.min(page + siblingCount, totalPages)
  const showStartEllipsis = left > 3
  const showEndEllipsis = right < totalPages - 2
  const edgeCount = siblingCount * 2 + 3

  if (!showStartEllipsis) return [...range(1, edgeCount), "end-ellipsis", totalPages]
  if (!showEndEllipsis) return [1, "start-ellipsis", ...range(totalPages - edgeCount + 1, totalPages)]

  return [1, "start-ellipsis", ...range(left, right), "end-ellipsis", totalPages]
}

// Controlled page navigation: `page` is 1-based and onChange reports the page the user picked. The
// previous/next buttons are icon-only, named by previousLabel/nextLabel; page buttons are named by
// their number, or by pageLabel when given (e.g. "Página 3"). The current page is marked with
// aria-current="page". It owns no copy: every label comes in through props.
export const Pagination = (props: PaginationProps) => {
  const {
    className,
    label,
    nextLabel,
    onChange,
    page,
    pageLabel,
    previousLabel,
    siblingCount = 1,
    style,
    totalPages,
  } = props

  const lastPage = Math.max(1, totalPages)
  const currentPage = Math.min(Math.max(1, page), lastPage)
  const entries = getEntries(currentPage, lastPage, siblingCount)

  return (
    <nav aria-label={label} className={className} style={style}>
      <StyledPaginationList>
        <li>
          <StyledPaginationButton
            aria-label={previousLabel}
            disabled={currentPage <= 1}
            onClick={() => onChange(currentPage - 1)}
            type="button"
          >
            <Icon color="secondary" name="chevron-left" size={16} />
          </StyledPaginationButton>
        </li>

        {entries.map((entry) => {
          if (typeof entry !== "number") {
            return (
              <li aria-hidden="true" key={entry}>
                <StyledPaginationEllipsis>…</StyledPaginationEllipsis>
              </li>
            )
          }

          const isCurrent = entry === currentPage

          return (
            <li key={entry}>
              <StyledPaginationButton
                $current={isCurrent}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={pageLabel?.(entry)}
                onClick={isCurrent ? undefined : () => onChange(entry)}
                type="button"
              >
                {entry}
              </StyledPaginationButton>
            </li>
          )
        })}

        <li>
          <StyledPaginationButton
            aria-label={nextLabel}
            disabled={currentPage >= lastPage}
            onClick={() => onChange(currentPage + 1)}
            type="button"
          >
            <Icon color="secondary" name="chevron-right" size={16} />
          </StyledPaginationButton>
        </li>
      </StyledPaginationList>
    </nav>
  )
}
