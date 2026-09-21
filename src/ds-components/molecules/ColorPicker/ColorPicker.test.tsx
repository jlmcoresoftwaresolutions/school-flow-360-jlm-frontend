import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ColorPicker } from "./ColorPicker"

describe("ColorPicker", () => {
  it("renders the title label", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    expect(screen.getByText("Cor primária")).toBeInTheDocument()
  })

  it("renders the hex input with the current value", () => {
    render(<ColorPicker title="Cor primária" value="#4b87d6" />)

    expect(screen.getByDisplayValue("#4b87d6")).toBeInTheDocument()
  })

  it("does not show the picker popover initially", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    expect(document.querySelector(".react-colorful")).not.toBeInTheDocument()
  })

  it("opens the picker popover when the swatch button is clicked", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))

    expect(document.querySelector(".react-colorful")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Abrir seletor de cor" })).toHaveAttribute("aria-expanded", "true")
  })

  it("closes the picker popover when clicking outside", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))
    expect(document.querySelector(".react-colorful")).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(document.querySelector(".react-colorful")).not.toBeInTheDocument()
  })

  it("closes the picker popover when pressing Escape", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))
    expect(document.querySelector(".react-colorful")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(document.querySelector(".react-colorful")).not.toBeInTheDocument()
  })

  it("calls onChange with the new value when a valid hex is typed", () => {
    const handleChange = vi.fn()
    render(<ColorPicker onChange={handleChange} title="Cor primária" value="#4B87D6" />)

    fireEvent.change(screen.getByDisplayValue("#4B87D6"), { target: { value: "#123456" } })

    expect(handleChange).toHaveBeenCalledWith("#123456")
  })

  it("disables the swatch button and hex input, and does not open on click, when disabled is set", () => {
    render(<ColorPicker disabled title="Cor primária" value="#4B87D6" />)

    expect(screen.getByRole("button", { name: "Abrir seletor de cor" })).toBeDisabled()
    expect(screen.getByDisplayValue("#4B87D6")).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))

    expect(document.querySelector(".react-colorful")).not.toBeInTheDocument()
  })

  it("renders R/G/B fields derived from the current value when the popover is open", () => {
    render(<ColorPicker title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))

    expect(screen.getByLabelText("R")).toHaveValue("75")
    expect(screen.getByLabelText("G")).toHaveValue("135")
    expect(screen.getByLabelText("B")).toHaveValue("214")
  })

  it("calls onChange with the recomputed hex when an R/G/B field changes", () => {
    const handleChange = vi.fn()
    render(<ColorPicker onChange={handleChange} title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))
    fireEvent.change(screen.getByLabelText("R"), { target: { value: "0" } })

    expect(handleChange).toHaveBeenCalledWith("#0087D6")
  })

  it("clamps an R/G/B field typed above 255 to the recomputed hex", () => {
    const handleChange = vi.fn()
    render(<ColorPicker onChange={handleChange} title="Cor primária" value="#4B87D6" />)

    fireEvent.click(screen.getByRole("button", { name: "Abrir seletor de cor" }))
    fireEvent.change(screen.getByLabelText("G"), { target: { value: "999" } })

    expect(handleChange).toHaveBeenCalledWith("#4BFFD6")
  })

  it("renders the helperText when passed", () => {
    render(<ColorPicker helperText="Aplicada aos portais." title="Cor primária" value="#4B87D6" />)

    expect(screen.getByText("Aplicada aos portais.")).toBeInTheDocument()
  })

  it("applies the className passed as a prop", () => {
    const { container } = render(<ColorPicker className="custom" title="Cor primária" value="#4B87D6" />)

    expect(container.firstChild).toHaveClass("custom")
  })
})
