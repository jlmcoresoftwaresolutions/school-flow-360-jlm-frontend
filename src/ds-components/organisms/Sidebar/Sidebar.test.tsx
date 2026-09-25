import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

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

  it("keeps only one group open: opening another closes the first", () => {
    renderSidebar({
      items: [
        ...items,
        {
          children: [{ key: "mensalidades", label: "Mensalidades" }],
          icon: "chat-outline",
          key: "financeiro",
          label: "Financeiro",
        },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }))

    expect(screen.getByRole("button", { name: "Financeiro" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Minha Escola")).not.toBeVisible()
    expect(screen.getByRole("button", { name: "Mensalidades" })).toBeVisible()
  })

  it("closes the group that was open by itself (active child) when another one is opened", () => {
    renderSidebar({
      items: [
        {
          children: [{ active: true, key: "minha-escola", label: "Minha Escola" }],
          icon: "gear-outline",
          key: "administracao",
          label: "Administração",
        },
        {
          children: [{ key: "mensalidades", label: "Mensalidades" }],
          icon: "chat-outline",
          key: "financeiro",
          label: "Financeiro",
        },
      ],
    })

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }))

    expect(screen.getByRole("button", { name: "Financeiro" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "false")
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

    // The panel holds the brand and the nav - a third child would be the bottom area.
    expect(container.querySelector("aside")?.firstElementChild?.children.length).toBe(2)
  })

  it("fills the height of its container instead of the viewport", () => {
    const { container } = renderSidebar()

    expect(container.firstChild).toHaveStyle({ height: "100%" })
  })

  it("applies the className passed as a prop", () => {
    const { container } = renderSidebar({ className: "custom" })

    expect(container.firstChild).toHaveClass("custom")
  })

  it("does not show a tooltip when hovering an item on a wide screen, where its label is already visible", () => {
    renderSidebar()

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Início" }).closest("li") as HTMLElement)

    expect(screen.getAllByText("Início")).toHaveLength(1)
  })

  it("centers the logo vertically in the header row instead of pinning it to the top", () => {
    renderSidebar()

    expect(screen.getByRole("img", { name: "Ícone" })).toHaveStyle({ alignSelf: "center" })
  })

  it("does not render the expand/collapse button on wide screens", () => {
    renderSidebar()

    expect(screen.queryByRole("button", { name: "Expandir menu" })).not.toBeInTheDocument()
    expect(screen.getByText("SchoolFlow360º")).toBeInTheDocument()
  })
})

// A compact screen is what `not all and (min-width: 768px)` matches - the stub answers yes to
// whatever query it is asked, which is the only one Sidebar makes.
const stubCompactScreen = () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches: true,
      media: query,
      removeEventListener: vi.fn(),
    })),
  )
}

describe("Sidebar on a compact screen", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("starts as an icon-only rail with a button to expand it", () => {
    stubCompactScreen()
    renderSidebar()

    expect(screen.getByRole("button", { name: "Expandir menu" })).toHaveAttribute("aria-expanded", "false")
    // The brand stays mounted so it can animate, but is hidden (and out of the accessibility tree).
    expect(screen.getByText("SchoolFlow360º")).not.toBeVisible()
    expect(screen.queryByRole("img", { name: "Ícone" })).not.toBeInTheDocument()
  })

  it("keeps every item reachable by its accessible name while only the icon shows", () => {
    stubCompactScreen()
    renderSidebar()

    expect(screen.getByRole("button", { name: "Início" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Administração" })).toBeInTheDocument()
  })

  it("shows the item's name as a tooltip when hovering anywhere over the item, not just its icon", () => {
    stubCompactScreen()
    renderSidebar()

    // Before hovering, the only "Início" text is the visually hidden label.
    expect(screen.getAllByText("Início")).toHaveLength(1)

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Início" }).closest("li") as HTMLElement)

    expect(screen.getAllByText("Início")).toHaveLength(2)
  })

  it("shows the tooltip over a disabled item too", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Usuários" }).closest("li") as HTMLElement)

    expect(screen.getAllByText("Usuários")).toHaveLength(2)
  })

  it("hides the tooltip again when the mouse leaves the item", () => {
    stubCompactScreen()
    renderSidebar()

    const item = screen.getByRole("button", { name: "Início" }).closest("li") as HTMLElement
    fireEvent.mouseEnter(item)
    fireEvent.mouseLeave(item)

    expect(screen.getAllByText("Início")).toHaveLength(1)
  })

  it("keeps a group's children hidden in the rail", () => {
    stubCompactScreen()
    renderSidebar()

    expect(screen.getByText("Minha Escola")).not.toBeVisible()
  })

  it("keeps the backdrop out of the way while collapsed and shows it once expanded", () => {
    stubCompactScreen()
    renderSidebar()

    expect(screen.queryByRole("presentation")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))

    expect(screen.getByRole("presentation")).toBeVisible()
  })

  it("expands over the content when the button is clicked, showing the brand and a backdrop", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))

    expect(screen.getByRole("button", { name: "Recolher menu" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("SchoolFlow360º")).toBeInTheDocument()
    expect(screen.getByRole("presentation")).toBeInTheDocument()
  })

  it("collapses again when the button is clicked", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))
    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }))

    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument()
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
  })

  it("collapses when the backdrop is clicked", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))
    fireEvent.click(screen.getByRole("presentation"))

    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument()
  })

  it("collapses when Escape is pressed", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))
    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument()
  })

  it("navigates and collapses when a plain item is clicked in the rail or once expanded", () => {
    stubCompactScreen()
    const handleClick = vi.fn()
    renderSidebar({ items: [{ icon: "home-outline", key: "inicio", label: "Início", onClick: handleClick }] })

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))
    fireEvent.click(screen.getByRole("button", { name: "Início" }))

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument()
  })

  it("collapses after a child is clicked", () => {
    stubCompactScreen()
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

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }))
    fireEvent.click(screen.getByRole("button", { name: "Minha Escola" }))

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument()
  })

  it("expands the sidebar and opens the group when a group icon is clicked in the rail", () => {
    stubCompactScreen()
    renderSidebar()

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.getByRole("button", { name: "Recolher menu" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Escola" })).toBeVisible()
  })
})
