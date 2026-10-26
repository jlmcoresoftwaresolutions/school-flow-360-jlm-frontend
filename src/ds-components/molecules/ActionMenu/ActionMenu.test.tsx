import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { colors } from "@/foundation"

import { ActionMenu, type ActionMenuItem, type ActionMenuProps } from "./ActionMenu"

const renderMenu = (overrides: Partial<ActionMenuProps> = {}) => {
  const onView = vi.fn()
  const onDelete = vi.fn()
  const items: ActionMenuItem[] = [
    { key: "view", label: "Visualizar", onClick: onView },
    { disabled: true, key: "edit", label: "Editar" },
    { key: "delete", label: "Inativar", onClick: onDelete, tone: "danger" },
  ]

  render(<ActionMenu items={items} triggerLabel="Ações da unidade" {...overrides} />)

  return { onDelete, onView }
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Ações da unidade" }))

describe("ActionMenu", () => {
  it("renders only the trigger, named by triggerLabel, while closed", () => {
    renderMenu()

    const trigger = screen.getByRole("button", { name: "Ações da unidade" })

    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("opens a menu with one menuitem per action when the trigger is clicked", () => {
    renderMenu()

    openMenu()

    expect(screen.getByRole("menu", { name: "Ações da unidade" })).toBeInTheDocument()
    expect(screen.getAllByRole("menuitem")).toHaveLength(3)
    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveAttribute("aria-expanded", "true")
  })

  it("renders the menu in a portal on document.body", () => {
    const { container } = render(<ActionMenu items={[{ key: "a", label: "A" }]} triggerLabel="Ações" />)

    fireEvent.click(screen.getByRole("button", { name: "Ações" }))

    expect(container).not.toContainElement(screen.getByRole("menu"))
    expect(document.body).toContainElement(screen.getByRole("menu"))
  })

  it("links the trigger to the open menu through aria-controls", () => {
    renderMenu()

    openMenu()

    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveAttribute(
      "aria-controls",
      screen.getByRole("menu").id,
    )
  })

  it("closes when the trigger is clicked again", () => {
    renderMenu()

    openMenu()
    openMenu()

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("moves focus to the first enabled item when it opens", () => {
    renderMenu()

    openMenu()

    expect(screen.getByRole("menuitem", { name: "Visualizar" })).toHaveFocus()
  })

  it("runs the item's onClick, closes the menu and returns focus to the trigger", () => {
    const { onView } = renderMenu()

    openMenu()
    fireEvent.click(screen.getByRole("menuitem", { name: "Visualizar" }))

    expect(onView).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveFocus()
  })

  it("does not run a disabled item", () => {
    renderMenu()

    openMenu()

    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeDisabled()
  })

  it("paints a danger item red", () => {
    renderMenu()

    openMenu()

    expect(screen.getByRole("menuitem", { name: "Inativar" })).toHaveStyle({ color: colors.danger[700] })
  })

  it("closes on Escape and returns focus to the trigger", () => {
    renderMenu()

    openMenu()
    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveFocus()
  })

  it("closes when the mouse is pressed outside, but not inside the menu", () => {
    renderMenu()

    openMenu()
    fireEvent.mouseDown(screen.getByRole("menu"))

    expect(screen.getByRole("menu")).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("closes when the page scrolls or the window resizes", () => {
    renderMenu()

    openMenu()
    fireEvent.scroll(window)

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()

    openMenu()
    fireEvent(window, new Event("resize"))

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  describe("keyboard", () => {
    it("moves between the enabled items with the arrows, skipping disabled ones and wrapping", () => {
      renderMenu()

      openMenu()
      const menu = screen.getByRole("menu")

      fireEvent.keyDown(menu, { key: "ArrowDown" })

      expect(screen.getByRole("menuitem", { name: "Inativar" })).toHaveFocus()

      fireEvent.keyDown(menu, { key: "ArrowDown" })

      expect(screen.getByRole("menuitem", { name: "Visualizar" })).toHaveFocus()

      fireEvent.keyDown(menu, { key: "ArrowUp" })

      expect(screen.getByRole("menuitem", { name: "Inativar" })).toHaveFocus()
    })

    it("jumps to the first and last enabled items with Home and End", () => {
      renderMenu()

      openMenu()
      const menu = screen.getByRole("menu")

      fireEvent.keyDown(menu, { key: "End" })

      expect(screen.getByRole("menuitem", { name: "Inativar" })).toHaveFocus()

      fireEvent.keyDown(menu, { key: "Home" })

      expect(screen.getByRole("menuitem", { name: "Visualizar" })).toHaveFocus()
    })

    it("closes on Tab", () => {
      renderMenu()

      openMenu()
      fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab" })

      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
  })

  describe("placement", () => {
    const stubTrigger = (rect: Partial<DOMRect>) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        ...rect,
      })
    }

    it("opens below the trigger, lined up with its right edge by default", () => {
      stubTrigger({ bottom: 40, left: 100, right: 140, top: 0 })
      renderMenu()

      openMenu()

      expect(screen.getByRole("menu")).toHaveStyle({ right: `${window.innerWidth - 140}px`, top: "44px" })

      vi.restoreAllMocks()
    })

    it("lines up with the trigger's left edge when align is start", () => {
      stubTrigger({ bottom: 40, left: 100, right: 140, top: 0 })
      renderMenu({ align: "start" })

      openMenu()

      expect(screen.getByRole("menu")).toHaveStyle({ left: "100px" })

      vi.restoreAllMocks()
    })

    it("opens upward when there is no room below the trigger", () => {
      stubTrigger({ bottom: window.innerHeight - 4, left: 0, right: 40, top: window.innerHeight - 44 })
      renderMenu()

      openMenu()

      expect(screen.getByRole("menu")).toHaveStyle({ bottom: "48px" })

      vi.restoreAllMocks()
    })
  })

  it("disables the trigger when disabled", () => {
    renderMenu({ disabled: true })

    expect(screen.getByRole("button", { name: "Ações da unidade" })).toBeDisabled()
  })

  it("forwards className and style to the trigger", () => {
    renderMenu({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveClass("custom")
    expect(screen.getByRole("button", { name: "Ações da unidade" })).toHaveStyle({ margin: "4px" })
  })

  it("shows triggerIcon on the trigger instead of the kebab", () => {
    const { container } = render(
      <ActionMenu items={[{ key: "a", label: "A" }]} triggerIcon="language" triggerLabel="Idioma" />,
    )
    const { container: kebab } = render(<ActionMenu items={[{ key: "a", label: "A" }]} triggerLabel="Ações" />)

    expect(container.querySelector("svg")?.innerHTML).not.toBe(kebab.querySelector("svg")?.innerHTML)
  })

  describe("checked items", () => {
    const languageItems: ActionMenuItem[] = [
      { checked: true, key: "pt-BR", label: "Português (Brasil)" },
      { checked: false, key: "en", label: "English" },
    ]

    it("renders items with checked set as menuitemradio, announcing which is checked", () => {
      render(<ActionMenu items={languageItems} triggerLabel="Idioma" />)

      fireEvent.click(screen.getByRole("button", { name: "Idioma" }))

      expect(screen.getByRole("menuitemradio", { name: "Português (Brasil)" })).toHaveAttribute("aria-checked", "true")
      expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "false")
    })

    it("moves focus to the checked item when it opens", () => {
      render(
        <ActionMenu
          items={[
            { checked: false, key: "pt-BR", label: "Português (Brasil)" },
            { checked: true, key: "en", label: "English" },
          ]}
          triggerLabel="Idioma"
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Idioma" }))

      expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveFocus()
    })

    it("moves between radio items with the arrows", () => {
      render(<ActionMenu items={languageItems} triggerLabel="Idioma" />)

      fireEvent.click(screen.getByRole("button", { name: "Idioma" }))
      fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" })

      expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveFocus()
    })

    it("shows a check mark only on the checked item", () => {
      render(<ActionMenu items={languageItems} triggerLabel="Idioma" />)

      fireEvent.click(screen.getByRole("button", { name: "Idioma" }))

      expect(screen.getByRole("menuitemradio", { name: "Português (Brasil)" }).querySelector("svg")).toBeInTheDocument()
      expect(screen.getByRole("menuitemradio", { name: "English" }).querySelector("svg")).not.toBeInTheDocument()
    })
  })
})
