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

  describe("clear", () => {
    it("renders a clear button that calls onClear", () => {
      const onClear = vi.fn()
      renderFilterBar({ clearLabel: "Limpar filtros", onClear })

      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it("disables the clear button with clearDisabled", () => {
      renderFilterBar({ clearDisabled: true, clearLabel: "Limpar filtros", onClear: vi.fn() })

      expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeDisabled()
    })

    it("is not rendered without a clearLabel", () => {
      renderFilterBar({ onClear: vi.fn() })

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
