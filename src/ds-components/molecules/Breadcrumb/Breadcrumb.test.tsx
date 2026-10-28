import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps } from "./Breadcrumb"

const items: BreadcrumbItem[] = [
  { key: "administracao", label: "Administração" },
  { href: "/administration/my-school", key: "minha-escola", label: "Minha Escola" },
  { key: "unidades", label: "Unidades" },
]

const renderBreadcrumb = (overrides: Partial<BreadcrumbProps> = {}) =>
  render(<Breadcrumb items={items} label="Você está em" {...overrides} />)

describe("Breadcrumb", () => {
  it("renders a navigation landmark named by label", () => {
    renderBreadcrumb()

    expect(screen.getByRole("navigation", { name: "Você está em" })).toBeInTheDocument()
  })

  it("renders one list item per entry, in order", () => {
    renderBreadcrumb()

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Administração",
      "Minha Escola",
      "Unidades",
    ])
  })

  it("marks the last entry as the current page and never makes it a link", () => {
    renderBreadcrumb({ items: [{ href: "/unidades", key: "unidades", label: "Unidades" }] })

    expect(screen.getByText("Unidades")).toHaveAttribute("aria-current", "page")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("renders an earlier entry with an href as a link", () => {
    renderBreadcrumb()

    expect(screen.getByRole("link", { name: "Minha Escola" })).toHaveAttribute("href", "/administration/my-school")
  })

  it("renders an earlier entry with only an onClick as a button that calls it", () => {
    const onClick = vi.fn()
    renderBreadcrumb({
      items: [
        { key: "inicio", label: "Início", onClick },
        { key: "atual", label: "Atual" },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Início" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders an earlier entry with neither as plain text", () => {
    renderBreadcrumb()

    expect(screen.getByText("Administração")).not.toHaveAttribute("aria-current")
    expect(screen.queryByRole("link", { name: "Administração" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Administração" })).not.toBeInTheDocument()
  })

  it("runs onClick instead of following the href on a plain click", () => {
    const onClick = vi.fn()
    renderBreadcrumb({
      items: [
        { href: "/inicio", key: "inicio", label: "Início", onClick },
        { key: "atual", label: "Atual" },
      ],
    })

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Início" }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it("leaves a modified click to the browser, so the link can open in a new tab", () => {
    const onClick = vi.fn()
    renderBreadcrumb({
      items: [
        { href: "/inicio", key: "inicio", label: "Início", onClick },
        { key: "atual", label: "Atual" },
      ],
    })

    // Read at the document, after React's handlers have run, then cancel it so jsdom doesn't try to navigate.
    let defaultPrevented = true
    const readAndCancel = (event: Event) => {
      defaultPrevented = event.defaultPrevented
      event.preventDefault()
    }

    document.addEventListener("click", readAndCancel)
    fireEvent.click(screen.getByRole("link", { name: "Início" }), { ctrlKey: true })
    document.removeEventListener("click", readAndCancel)

    expect(onClick).not.toHaveBeenCalled()
    expect(defaultPrevented).toBe(false)
  })

  it("renders a decorative separator between entries but not after the last", () => {
    const { container } = renderBreadcrumb()

    expect(container.querySelectorAll("svg")).toHaveLength(2)
  })

  it("forwards className and style to the nav", () => {
    renderBreadcrumb({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("navigation")).toHaveClass("custom")
    expect(screen.getByRole("navigation")).toHaveStyle({ margin: "4px" })
  })
})
