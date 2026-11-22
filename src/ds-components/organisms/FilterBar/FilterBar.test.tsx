import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FilterBar, type FilterBarProps } from "./FilterBar"

const renderFilterBar = (overrides: Partial<FilterBarProps> = {}) =>
  render(<FilterBar label="Filtrar unidades" {...overrides} />)

describe("FilterBar", () => {
  it("renders a search landmark named by label", () => {
    renderFilterBar()

    expect(screen.getByRole("search", { name: "Filtrar unidades" })).toBeInTheDocument()
  })

  describe("search", () => {
    it("is not rendered without onSearchChange", () => {
      renderFilterBar()

      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    })

    it("renders a search field named by searchLabel, showing searchValue", () => {
      renderFilterBar({ onSearchChange: vi.fn(), searchLabel: "Buscar unidade", searchValue: "Centro" })

      expect(screen.getByRole("searchbox", { name: "Buscar unidade" })).toHaveValue("Centro")
    })

    it("shows searchPlaceholder", () => {
      renderFilterBar({ onSearchChange: vi.fn(), searchLabel: "Buscar", searchPlaceholder: "Nome ou cidade..." })

      expect(screen.getByPlaceholderText("Nome ou cidade...")).toBeInTheDocument()
    })

    it("reports what the user types", () => {
      const onSearchChange = vi.fn()
      renderFilterBar({ onSearchChange, searchLabel: "Buscar" })

      fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), { target: { value: "Norte" } })

      expect(onSearchChange).toHaveBeenCalledWith("Norte")
    })
  })

  it("renders each child as a filter", () => {
    renderFilterBar({
      children: [<button key="status">Status</button>, <button key="cidade">Cidade</button>],
    })

    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cidade" })).toBeInTheDocument()
  })

  it('renders the title "Filtros" by default and renames it with title', () => {
    const { rerender } = renderFilterBar()

    expect(screen.getByRole("heading", { name: "Filtros" })).toBeInTheDocument()

    rerender(<FilterBar label="Filtrar unidades" title="Filtrar unidades" />)

    expect(screen.getByRole("heading", { name: "Filtrar unidades" })).toBeInTheDocument()
  })

  it("lays out the title, the filters and then the search with the actions, in that order", () => {
    renderFilterBar({
      actions: <button type="button">Nova unidade</button>,
      children: <button type="button">Status</button>,
      onSearchChange: vi.fn(),
      searchLabel: "Buscar",
    })

    const rows = Array.from(screen.getByRole("search", { name: "Filtrar unidades" }).children)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("Filtros")
    expect(rows[1]).toHaveTextContent("Status")
    expect(rows[2].querySelector("input")).toHaveAccessibleName("Buscar")
    expect(rows[2]).toHaveTextContent("Nova unidade")
  })

  it("does not render a row that has nothing in it", () => {
    renderFilterBar({ children: <button type="button">Status</button> })

    expect(screen.getByRole("search", { name: "Filtrar unidades" }).children).toHaveLength(2)
  })

  describe("expanding and hiding the filters", () => {
    const filters = [
      <button key="status" type="button">
        Status
      </button>,
    ]

    it("starts open, with a button to hide the filters", () => {
      renderFilterBar({ children: filters })

      expect(screen.getByRole("button", { name: "Status" })).toBeVisible()
      expect(screen.getByRole("button", { name: "Ocultar filtros" })).toHaveAttribute("aria-expanded", "true")
    })

    it('hides the filters and swaps the label to "Expandir filtros", and back', () => {
      renderFilterBar({ children: filters })

      fireEvent.click(screen.getByRole("button", { name: "Ocultar filtros" }))

      expect(screen.getByText("Status")).not.toBeVisible()
      expect(screen.getByRole("button", { name: "Expandir filtros" })).toHaveAttribute("aria-expanded", "false")

      fireEvent.click(screen.getByRole("button", { name: "Expandir filtros" }))

      expect(screen.getByRole("button", { name: "Status" })).toBeVisible()
    })

    it("starts hidden with defaultOpen false", () => {
      renderFilterBar({ children: filters, defaultOpen: false })

      expect(screen.getByText("Status")).not.toBeVisible()
      expect(screen.getByRole("button", { name: "Expandir filtros" })).toBeInTheDocument()
    })

    it("takes the labels from collapseLabel and expandLabel", () => {
      renderFilterBar({ children: filters, collapseLabel: "Hide filters", expandLabel: "Show filters" })

      fireEvent.click(screen.getByRole("button", { name: "Hide filters" }))

      expect(screen.getByRole("button", { name: "Show filters" })).toBeInTheDocument()
    })

    it("keeps the search, clear and actions visible while the filters are hidden", () => {
      renderFilterBar({
        actions: <button type="button">Nova unidade</button>,
        children: filters,
        clearLabel: "Limpar filtros",
        hasActiveFilters: true,
        onClear: vi.fn(),
        onSearchChange: vi.fn(),
        searchLabel: "Buscar",
      })

      fireEvent.click(screen.getByRole("button", { name: "Ocultar filtros" }))

      expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeVisible()
      expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeVisible()
      expect(screen.getByRole("button", { name: "Nova unidade" })).toBeVisible()
    })

    it("has no button without filters", () => {
      renderFilterBar()

      expect(screen.queryByRole("button", { name: "Ocultar filtros" })).not.toBeInTheDocument()
    })
  })

  describe("clear", () => {
    it("renders a clear button that calls onClear", () => {
      const onClear = vi.fn()
      renderFilterBar({ clearLabel: "Limpar filtros", hasActiveFilters: true, onClear })

      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it("is not rendered while no filter is set, and shows once hasActiveFilters is true", () => {
      const { rerender } = renderFilterBar({ clearLabel: "Limpar filtros", onClear: vi.fn() })

      expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument()

      rerender(<FilterBar clearLabel="Limpar filtros" hasActiveFilters label="Filtrar unidades" onClear={vi.fn()} />)

      expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument()
    })

    it("stays in the bar while hidden, inert, so it can slide in and out", () => {
      renderFilterBar({ clearLabel: "Limpar filtros", onClear: vi.fn() })

      const button = screen.getByText("Limpar filtros")

      expect(button).not.toBeVisible()
      expect(button.closest("[inert]")).not.toBeNull()
    })

    it("moves the focus to the search after clearing, since the button hides itself", () => {
      renderFilterBar({
        clearLabel: "Limpar filtros",
        hasActiveFilters: true,
        onClear: vi.fn(),
        onSearchChange: vi.fn(),
        searchLabel: "Buscar",
      })

      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

      expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveFocus()
    })

    it("moves the focus to the button that hides the filters when there is no search", () => {
      renderFilterBar({
        children: <button type="button">Status</button>,
        clearLabel: "Limpar filtros",
        hasActiveFilters: true,
        onClear: vi.fn(),
      })

      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

      expect(screen.getByRole("button", { name: "Ocultar filtros" })).toHaveFocus()
    })

    it("is not rendered without a clearLabel", () => {
      renderFilterBar({ hasActiveFilters: true, onClear: vi.fn() })

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  it("renders the actions", () => {
    renderFilterBar({ actions: <button>Nova unidade</button> })

    expect(screen.getByRole("button", { name: "Nova unidade" })).toBeInTheDocument()
  })

  it("forwards className and style", () => {
    renderFilterBar({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("search")).toHaveClass("custom")
    expect(screen.getByRole("search")).toHaveStyle({ margin: "4px" })
  })
})
