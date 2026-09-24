import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { SidebarNavItem, SidebarProps } from "./Sidebar"
import { Sidebar } from "./Sidebar"

const items: SidebarNavItem[] = [
  { icon: "home-outline", key: "inicio", label: "Início" },
  {
    children: [
      { key: "minha-escola", label: "Minha Escola" },
      { key: "unidades", label: "Unidades" },
    ],
    icon: "gear-outline",
    key: "administracao",
    label: "Administração",
  },
  { disabled: true, icon: "users-outline", key: "usuarios", label: "Usuários" },
]

const renderSidebar = (overrides: Partial<SidebarProps> = {}) =>
  render(<Sidebar items={items} logoAlt="Ícone" logoSrc="/logo.svg" title="SchoolFlow360º" {...overrides} />)

describe("Sidebar", () => {
  it("renders the brand title and logo", () => {
    renderSidebar()

    expect(screen.getByText("SchoolFlow360º")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Ícone" })).toHaveAttribute("src", "/logo.svg")
  })

  it("renders a button for every top-level item", () => {
    renderSidebar()

    expect(screen.getByRole("button", { name: "Início" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Administração" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Usuários" })).toBeInTheDocument()
  })

  it("marks the active item with aria-current, and leaves other items without it", () => {
    renderSidebar({ items: [{ active: true, icon: "home-outline", key: "inicio", label: "Início" }, items[2]] })

    expect(screen.getByRole("button", { name: "Início" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Usuários" })).not.toHaveAttribute("aria-current")
  })

  it("calls onClick when an item is clicked", () => {
    const handleClick = vi.fn()
    renderSidebar({ items: [{ icon: "home-outline", key: "inicio", label: "Início", onClick: handleClick }] })

    fireEvent.click(screen.getByRole("button", { name: "Início" }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("disables an item marked disabled", () => {
    renderSidebar()

    expect(screen.getByRole("button", { name: "Usuários" })).toBeDisabled()
  })

  it("does not call onClick on a disabled item", () => {
    const handleClick = vi.fn()
    renderSidebar({
      items: [{ disabled: true, icon: "home-outline", key: "inicio", label: "Início", onClick: handleClick }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Início" }))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it("keeps a group collapsed when none of its children is active", () => {
    renderSidebar()

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "Minha Escola" })).not.toBeInTheDocument()
  })

  it("keeps a collapsed group's children mounted but hidden, so the collapse can animate", () => {
    renderSidebar()

    // By text, not role: a hidden element loses its accessible name, which is the point of hiding it.
    const child = screen.getByText("Minha Escola")

    expect(child).toBeInTheDocument()
    expect(child).not.toBeVisible()
  })

  it("makes the children visible once the group is expanded", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.getByRole("button", { name: "Minha Escola" })).toBeVisible()
  })

  it("links a group header to its children through aria-controls", () => {
    renderSidebar()

    const controlled = document.getElementById(
      screen.getByRole("button", { name: "Administração" }).getAttribute("aria-controls") ?? "",
    )

    expect(controlled).toContainElement(screen.getByText("Minha Escola"))
  })

  it("expands and collapses a group when its header is clicked", () => {
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Escola" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unidades" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.queryByRole("button", { name: "Minha Escola" })).not.toBeInTheDocument()
  })

  it("opens a group by itself when one of its children is active", () => {
    renderSidebar({
      items: [
        {
          children: [{ active: true, key: "minha-escola", label: "Minha Escola" }],
          icon: "gear-outline",
          key: "administracao",
          label: "Administração",
        },
      ],
    })

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
  })

  it("calls a child's onClick when it is clicked", () => {
    const handleClick = vi.fn()
    renderSidebar({
      items: [
        {
          children: [{ active: true, key: "minha-escola", label: "Minha Escola", onClick: handleClick }],
          icon: "gear-outline",
          key: "administracao",
          label: "Administração",
        },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Minha Escola" }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders bottomItems after the menu", () => {
    renderSidebar({ bottomItems: [{ icon: "help-outline", key: "ajuda", label: "Ajuda" }] })

    expect(screen.getByRole("button", { name: "Ajuda" })).toBeInTheDocument()
  })

  it("does not render a bottom area when bottomItems is not passed", () => {
    const { container } = renderSidebar()

    expect(container.querySelector("aside")?.children.length).toBe(2)
  })

  it("fills the height of its container instead of the viewport", () => {
    const { container } = renderSidebar()

    expect(container.firstChild).toHaveStyle({ height: "100%" })
  })

  it("applies the className passed as a prop", () => {
    const { container } = renderSidebar({ className: "custom" })

    expect(container.firstChild).toHaveClass("custom")
  })
})
