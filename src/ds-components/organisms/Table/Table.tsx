import type { CSSProperties, ReactElement, ReactNode } from "react"
import { Children, isValidElement, useState } from "react"

import { Button, Icon, Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import type { TableAlign } from "./Table.styles"
import {
  StyledTable,
  StyledTableCell,
  StyledTableHeadCell,
  TableEmptyCell,
  TableFooter,
  TableHeadCellContent,
  TableRow,
  TableWrapper,
} from "./Table.styles"

export type TableColumnProps<T> = {
  field: keyof T & string
  header: string
  align?: TableAlign
  sortable?: boolean
  width?: string
  body?: (row: T, rowIndex: number) => ReactNode
}

// Lowercase on purpose: never rendered as JSX, only read for its props (see the `columns` filter
// below) and attached onto Table as Table.Column - a capitalized top-level const here would make
// eslint-plugin-react-refresh treat it as an orphaned, un-exported component.
const columnMarker = <T,>(_props: TableColumnProps<T>) => null

type SortOrder = "asc" | "desc"

// Numbers compare numerically; everything else (strings, booleans, dates already formatted for
// display, ...) falls back to a pt-BR-aware string comparison so accented characters sort correctly.
const compareValues = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "pt-BR")
}

export type TableProps<T> = {
  children: ReactNode
  value: T[]
  className?: string
  dataKey?: keyof T & string
  emptyMessage?: string
  loading?: boolean
  paginator?: boolean
  rows?: number
  striped?: boolean
  style?: CSSProperties
}

type TableComponentType = {
  <T>(props: TableProps<T>): ReactElement
  Column: typeof columnMarker
}

// eslint-plugin-react-hooks requires the enclosing function's own name to be capitalized to
// recognize it as a component allowed to call hooks - hence "Table" here (not a lowercase temp
// name later merged in), with Table.Column attached as a plain assignment right after.
export const Table = (<T,>(props: TableProps<T>) => {
  const {
    children,
    className,
    dataKey,
    emptyMessage = "Nenhum registro encontrado.",
    loading = false,
    paginator = false,
    rows = 10,
    striped = true,
    style,
    value,
  } = props

  const [sortField, setSortField] = useState<(keyof T & string) | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [page, setPage] = useState(0)

  const columns = Children.toArray(children).filter(
    (child): child is ReactElement<TableColumnProps<T>> => isValidElement(child) && child.type === columnMarker,
  )
  const sortedValue = sortField
    ? [...value].sort((a, b) => {
        const result = compareValues(a[sortField], b[sortField])
        return sortOrder === "asc" ? result : -result
      })
    : value
  const totalPages = Math.max(1, Math.ceil(sortedValue.length / rows))
  const currentPage = Math.min(page, totalPages - 1)
  const pagedValue = paginator ? sortedValue.slice(currentPage * rows, currentPage * rows + rows) : sortedValue

  // Cycles asc -> desc -> unsorted, so a sortable column can always be returned to its natural order.
  const handleSort = (field: keyof T & string) => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder("asc")
      return
    }

    if (sortOrder === "asc") {
      setSortOrder("desc")
      return
    }

    setSortField(null)
  }

  return (
    <TableWrapper className={className} style={style}>
      <StyledTable>
        <thead>
          <tr>
            {columns.map((column) => {
              const { align = "left", field, header, sortable, width } = column.props

              return (
                <StyledTableHeadCell
                  $align={align}
                  $sortable={Boolean(sortable)}
                  key={field}
                  onClick={sortable ? () => handleSort(field) : undefined}
                  style={width ? { width } : undefined}
                >
                  <TableHeadCellContent $align={align}>
                    {header}
                    {sortable && (
                      <Icon
                        color={sortField === field ? "brand" : "muted"}
                        name={sortField === field && sortOrder === "desc" ? "chevron-down" : "chevron-up"}
                        size={16}
                      />
                    )}
                  </TableHeadCellContent>
                </StyledTableHeadCell>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <TableEmptyCell colSpan={columns.length}>Carregando...</TableEmptyCell>
            </tr>
          )}
          {!loading && pagedValue.length === 0 && (
            <tr>
              <TableEmptyCell colSpan={columns.length}>{emptyMessage}</TableEmptyCell>
            </tr>
          )}
          {!loading &&
            pagedValue.map((row, rowIndex) => (
              <TableRow $striped={striped} key={dataKey ? String(row[dataKey]) : rowIndex}>
                {columns.map((column) => {
                  const { align = "left", body, field } = column.props

                  return (
                    <StyledTableCell $align={align} key={field}>
                      {body ? body(row, rowIndex) : String(row[field] ?? "")}
                    </StyledTableCell>
                  )
                })}
              </TableRow>
            ))}
        </tbody>
      </StyledTable>

      {paginator && (
        <TableFooter>
          <Text color="secondary" fontSize="sm">
            Página {currentPage + 1} de {totalPages}
          </Text>

          <div style={{ display: "flex", gap: spacing[8] }}>
            <Button
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              size="small"
              variant="outlined"
            >
              Anterior
            </Button>

            <Button
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              size="small"
              variant="outlined"
            >
              Próxima
            </Button>
          </div>
        </TableFooter>
      )}
    </TableWrapper>
  )
}) as TableComponentType

Table.Column = columnMarker
