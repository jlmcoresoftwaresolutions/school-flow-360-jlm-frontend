import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { colors, spacing } from "@/foundation"

import { IconButton } from "./IconButton"

describe("IconButton", () => {
  it("is a button named by label, showing only an icon", () => {
    render(<IconButton icon="trash-outline" label="Remover" />)

    const button = screen.getByRole("button", { name: "Remover" })
    expect(button).toHaveAttribute("type", "button")
    expect(button.querySelector("svg")).toBeInTheDocument()
    expect(button).not.toHaveTextContent("Remover")
  })

  it("runs onClick", () => {
    const onClick = vi.fn()
    render(<IconButton icon="trash-outline" label="Remover" onClick={onClick} />)

    fireEvent.click(screen.getByRole("button", { name: "Remover" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("doesn't run onClick while disabled", () => {
    const onClick = vi.fn()
    render(<IconButton icon="trash-outline" label="Remover" onClick={onClick} disabled />)

    fireEvent.click(screen.getByRole("button", { name: "Remover" }))

    expect(screen.getByRole("button", { name: "Remover" })).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it("shows the label as a tooltip on hover by default", () => {
    render(<IconButton icon="trash-outline" label="Remover" />)

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Remover" }))

    expect(screen.getByRole("tooltip")).toHaveTextContent("Remover")
  })

  it("shows tooltip instead of the label when given, and none when it is empty", () => {
    const { rerender } = render(<IconButton icon="trash-outline" label="Remover o papel 2" tooltip="Remover" />)

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Remover o papel 2" }))
    expect(screen.getByRole("tooltip")).toHaveTextContent(/^Remover$/)

    rerender(<IconButton icon="trash-outline" label="Remover o papel 2" tooltip="" />)
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Remover o papel 2" }))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("paints the icon in the given color", () => {
    render(<IconButton color="danger" icon="trash-outline" label="Remover" />)

    expect(screen.getByRole("button", { name: "Remover" })).toHaveStyle({ color: colors.danger[700] })
  })

  it("is 40px square by default and follows the size prop", () => {
    const { rerender } = render(<IconButton icon="trash-outline" label="Remover" />)
    expect(screen.getByRole("button")).toHaveStyle({ height: spacing[40], width: spacing[40] })

    rerender(<IconButton icon="trash-outline" label="Remover" size="large" />)
    expect(screen.getByRole("button")).toHaveStyle({ height: spacing[48], width: spacing[48] })
  })

  it("forwards a ref to the button", () => {
    const ref = createRef<HTMLButtonElement>()
    render(<IconButton icon="trash-outline" label="Remover" ref={ref} />)

    expect(ref.current).toBe(screen.getByRole("button"))
  })

  it("forwards className and style", () => {
    render(<IconButton className="custom" icon="trash-outline" label="Remover" style={{ margin: "4px" }} />)

    expect(screen.getByRole("button")).toHaveClass("custom")
    expect(screen.getByRole("button")).toHaveStyle({ margin: "4px" })
  })
})
