import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SidebarNavSection } from "./Sidebar"
import { Sidebar } from "./Sidebar"

const sections: SidebarNavSection[] = [
  {
    items: [
      { active: true, icon: "home-outline", key: "minha-escola", label: "Minha Escola" },
      { icon: "users-outline", key: "usuarios", label: "Usuários" },
    ],
    key: "administracao",
    title: "Administração",
  },
  {
    items: [{ icon: "users-outline", key: "alunos", label: "Alunos" }],
    key: "pessoas",
  },
]

const renderSidebar = (overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) =>
  render(<Sidebar logoAlt="Ícone" logoSrc="/logo.svg" sections={sections} title="SchoolFlow360º" {...overrides} />)

describe("Sidebar", () => {
  it("renders the brand title and subtitle", () => {
    renderSidebar({ subtitle: "JLM CORE" })

    expect(screen.getByText("SchoolFlow360º")).toBeInTheDocument()
    expect(screen.getByText("JLM CORE")).toBeInTheDocument()
  })

  it("does not render a subtitle when it is not passed", () => {
    renderSidebar()

    expect(screen.queryByText("JLM CORE")).not.toBeInTheDocument()
  })

  it("renders a section title only when the section has one", () => {
    renderSidebar()

    expect(screen.getByText("Administração")).toBeInTheDocument()
    expect(screen.queryByText("Pessoas")).not.toBeInTheDocument()
  })

  it("renders a nav item for every item across all sections", () => {
    renderSidebar()

    expect(screen.getByRole("button", { name: "Minha Escola" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Usuários" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alunos" })).toBeInTheDocument()
  })

  it("marks the active item with aria-current, and leaves other items without it", () => {
    renderSidebar()

    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Usuários" })).not.toHaveAttribute("aria-current")
  })

  it("calls onClick when a nav item is clicked", () => {
    let clicked = false
    renderSidebar({
      sections: [
        {
          items: [
            { icon: "home-outline", key: "minha-escola", label: "Minha Escola", onClick: () => (clicked = true) },
          ],
          key: "administracao",
        },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Minha Escola" }))

    expect(clicked).toBe(true)
  })

  it("renders the footer content when passed", () => {
    renderSidebar({ footer: <span>Colégio Horizonte</span> })

    expect(screen.getByText("Colégio Horizonte")).toBeInTheDocument()
  })

  it("does not render a footer element when footer is not passed", () => {
    const { container } = renderSidebar()

    expect(container.querySelector("aside")?.children.length).toBe(2)
  })

  it("applies the className passed as a prop", () => {
    const { container } = renderSidebar({ className: "custom" })

    expect(container.firstChild).toHaveClass("custom")
  })
})
