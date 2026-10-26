import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Topbar, type TopbarAction, type TopbarProps } from "./Topbar"

const actions: TopbarAction[] = [
  { icon: "bell-outline", key: "notificacoes", label: "Notificações" },
  { disabled: true, icon: "help-outline", key: "ajuda", label: "Ajuda" },
]

const renderTopbar = (overrides: Partial<TopbarProps> = {}) => render(<Topbar {...overrides} />)

// jsdom has no matchMedia, so the narrow-screen rule can't be exercised; this only reads the markup.
describe("Topbar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a banner landmark", () => {
    renderTopbar()

    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  it("renders its children on the leading side", () => {
    renderTopbar({ children: <span>Trilha da página</span> })

    expect(screen.getByText("Trilha da página")).toBeInTheDocument()
  })

  it("renders nothing on the trailing side when there are no actions and no user", () => {
    renderTopbar()

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders one icon button per action, named by its label", () => {
    renderTopbar({ actions })

    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ajuda" })).toBeInTheDocument()
  })

  it("runs an action's onClick", () => {
    const onClick = vi.fn()
    renderTopbar({ actions: [{ icon: "bell-outline", key: "n", label: "Notificações", onClick }] })

    fireEvent.click(screen.getByRole("button", { name: "Notificações" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("disables an action marked as disabled", () => {
    renderTopbar({ actions })

    expect(screen.getByRole("button", { name: "Ajuda" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Notificações" })).toBeEnabled()
  })

  it("shows an action's label as a tooltip on hover", () => {
    renderTopbar({ actions })

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Notificações" }))

    expect(screen.getByText("Notificações", { selector: "div" })).toBeInTheDocument()
  })

  it("renders extraActions on the trailing side", () => {
    renderTopbar({ extraActions: <button>Alterar idioma</button> })

    expect(screen.getByRole("button", { name: "Alterar idioma" })).toBeInTheDocument()
  })

  describe("user", () => {
    it("shows the name and the role", () => {
      renderTopbar({ user: { name: "Maria da Silva", role: "Diretora" } })

      expect(screen.getByText("Maria da Silva")).toBeInTheDocument()
      expect(screen.getByText("Diretora")).toBeInTheDocument()
    })

    it("omits the role when none is given", () => {
      renderTopbar({ user: { name: "Maria da Silva" } })

      expect(screen.getByText("Maria da Silva")).toBeInTheDocument()
      expect(screen.queryByText("Diretora")).not.toBeInTheDocument()
    })

    it("shows the initials in a decorative avatar when there is no photo", () => {
      renderTopbar({ user: { name: "Maria da Silva" } })

      expect(screen.getByText("MS")).toHaveAttribute("aria-hidden", "true")
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("shows the photo instead of the initials when avatarSrc is given", () => {
      const { container } = renderTopbar({ user: { avatarSrc: "/maria.png", name: "Maria da Silva" } })

      expect(container.querySelector("img")).toHaveAttribute("src", "/maria.png")
      expect(screen.queryByText("MS")).not.toBeInTheDocument()
    })

    it("gives the photo an empty alt, since the name is already next to it", () => {
      const { container } = renderTopbar({ user: { avatarSrc: "/maria.png", name: "Maria da Silva" } })

      expect(container.querySelector("img")).toHaveAttribute("alt", "")
    })
  })

  it("forwards className and style to the header", () => {
    renderTopbar({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("banner")).toHaveClass("custom")
    expect(screen.getByRole("banner")).toHaveStyle({ margin: "4px" })
  })
})
