import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Pagination, type PaginationProps } from "./Pagination"

const renderPagination = (overrides: Partial<PaginationProps> = {}) => {
  const onChange = vi.fn()

  render(
    <Pagination
      label="Paginação"
      nextLabel="Próxima página"
      onChange={onChange}
      page={1}
      previousLabel="Página anterior"
      totalPages={5}
      {...overrides}
    />,
  )

  return { onChange }
}

// The visible entries, in order: page numbers as text and every ellipsis as "…". hidden: true keeps
// the ellipses, whose list items are aria-hidden, in the list.
const visibleEntries = () =>
  screen
    .getAllByRole("listitem", { hidden: true })
    .slice(1, -1)
    .map((item) => item.textContent)

describe("Pagination", () => {
  it("renders a navigation landmark named by label", () => {
    renderPagination()

    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument()
  })

  it("shows every page when they all fit", () => {
    renderPagination({ totalPages: 5 })

    expect(visibleEntries()).toEqual(["1", "2", "3", "4", "5"])
  })

  it("marks the current page with aria-current", () => {
    renderPagination({ page: 3 })

    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "2" })).not.toHaveAttribute("aria-current")
  })

  it("calls onChange with the page that was clicked", () => {
    const { onChange } = renderPagination({ page: 1 })

    fireEvent.click(screen.getByRole("button", { name: "4" }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it("does not call onChange when the current page is clicked", () => {
    const { onChange } = renderPagination({ page: 2 })

    fireEvent.click(screen.getByRole("button", { name: "2" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("moves one page back and forward with the previous and next buttons", () => {
    const { onChange } = renderPagination({ page: 3 })

    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }))
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }))

    expect(onChange).toHaveBeenNthCalledWith(1, 2)
    expect(onChange).toHaveBeenNthCalledWith(2, 4)
  })

  it("disables previous on the first page and next on the last", () => {
    renderPagination({ page: 1 })

    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled()
  })

  it("disables next on the last page", () => {
    renderPagination({ page: 5 })

    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled()
  })

  it("names the page buttons with pageLabel when given", () => {
    renderPagination({ pageLabel: (page) => `Página ${page}` })

    expect(screen.getByRole("button", { name: "Página 2" })).toBeInTheDocument()
  })

  describe("with many pages", () => {
    it("collapses the end into an ellipsis near the start", () => {
      renderPagination({ page: 1, totalPages: 10 })

      expect(visibleEntries()).toEqual(["1", "2", "3", "4", "5", "…", "10"])
    })

    it("collapses both sides around a page in the middle", () => {
      renderPagination({ page: 5, totalPages: 10 })

      expect(visibleEntries()).toEqual(["1", "…", "4", "5", "6", "…", "10"])
    })

    it("collapses the start into an ellipsis near the end", () => {
      renderPagination({ page: 10, totalPages: 10 })

      expect(visibleEntries()).toEqual(["1", "…", "6", "7", "8", "9", "10"])
    })

    it("shows more neighbours with a larger siblingCount", () => {
      renderPagination({ page: 10, siblingCount: 2, totalPages: 20 })

      expect(visibleEntries()).toEqual(["1", "…", "8", "9", "10", "11", "12", "…", "20"])
    })

    it("hides the ellipses from assistive technology", () => {
      renderPagination({ page: 5, totalPages: 10 })

      screen.getAllByText("…").forEach((ellipsis) => {
        expect(ellipsis.closest("li")).toHaveAttribute("aria-hidden", "true")
      })
    })
  })

  it("treats zero pages as a single page", () => {
    renderPagination({ page: 1, totalPages: 0 })

    expect(visibleEntries()).toEqual(["1"])
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled()
  })

  it("clamps a page past the end to the last page", () => {
    renderPagination({ page: 9, totalPages: 3 })

    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page")
  })

  it("forwards className and style to the nav", () => {
    renderPagination({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("navigation")).toHaveClass("custom")
    expect(screen.getByRole("navigation")).toHaveStyle({ margin: "4px" })
  })
})
