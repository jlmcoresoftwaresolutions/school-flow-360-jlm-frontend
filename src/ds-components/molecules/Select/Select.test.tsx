import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import type { SelectInstance } from "react-select"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, shadows, spacing } from "@/foundation"

import { Select, type SelectOption } from "./Select"

const options: SelectOption[] = [
  { label: "Manhã", value: "manha" },
  { label: "Tarde", value: "tarde" },
]

describe("Select", () => {
  it("renders a select with the given options", () => {
    render(<Select options={options} />)

    fireEvent.mouseDown(screen.getByRole("combobox"))

    expect(screen.getByText("Manhã")).toBeInTheDocument()
    expect(screen.getByText("Tarde")).toBeInTheDocument()
  })

  it("renders a placeholder when no value is selected", () => {
    render(<Select options={options} placeholder="Selecione..." />)

    expect(screen.getByText("Selecione...")).toBeInTheDocument()
  })

  it("does not render a placeholder when placeholder is not provided", () => {
    render(<Select options={options} />)

    expect(screen.queryByText("Selecione...")).not.toBeInTheDocument()
  })

  it("renders the title as a label associated with the select", () => {
    render(<Select options={options} title="Turno" />)

    const select = screen.getByLabelText("Turno")

    expect(select).toBeInTheDocument()
    expect(select).toHaveAttribute("role", "combobox")
  })

  it("renders helperText below the select", () => {
    render(<Select helperText="Define o período das aulas." options={options} />)

    expect(screen.getByText("Define o período das aulas.")).toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Select className="custom" options={options} />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Select options={options} style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying react-select instance", () => {
    const ref = createRef<SelectInstance<SelectOption, false>>()

    render(<Select options={options} ref={ref} />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.focus).toBeInstanceOf(Function)
  })

  it("shows the value passed via the value prop", () => {
    render(<Select options={options} title="Turno" value={options[0]} />)

    expect(screen.getByText("Manhã")).toBeInTheDocument()
  })

  it("calls onChange with the picked option", () => {
    const handleChange = vi.fn()

    render(<Select onChange={handleChange} options={options} title="Turno" value={options[0]} />)

    fireEvent.mouseDown(screen.getByRole("combobox"))
    fireEvent.click(screen.getByText("Tarde"))

    expect(handleChange).toHaveBeenCalledWith(options[1], expect.anything())
  })

  it("uses the defaultValue prop for uncontrolled usage", () => {
    render(<Select defaultValue={options[1]} options={options} title="Turno" />)

    expect(screen.getByText("Tarde")).toBeInTheDocument()
  })

  it("defaults to the low border radius", () => {
    const { container } = render(<Select options={options} title="Turno" />)

    expect(container.querySelector(".select__control")).toHaveStyle({ borderRadius: borderRadiusLevels.low })
  })

  it("applies the borderRadius prop", () => {
    const { container } = render(<Select borderRadius="high" options={options} title="Turno" />)

    expect(container.querySelector(".select__control")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("has a drop shadow by default", () => {
    const { container } = render(<Select options={options} title="Turno" />)

    expect(container.querySelector(".select__control")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    const { container } = render(<Select elevated={false} options={options} title="Turno" />)

    expect(container.querySelector(".select__control")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("respects the isDisabled prop", () => {
    const { container } = render(<Select isDisabled options={options} title="Turno" />)

    expect(container.querySelector(".select__control")).toHaveAttribute("aria-disabled", "true")
  })

  it("makes helperText transparent while the menu is open", () => {
    render(<Select helperText="Define o período das aulas." options={options} />)

    const helperText = screen.getByText("Define o período das aulas.")

    expect(helperText).toHaveStyle({ opacity: "1" })

    fireEvent.mouseDown(screen.getByRole("combobox"))

    expect(helperText).toHaveStyle({ opacity: "0" })
  })

  it("rotates the dropdown indicator icon when the menu opens", () => {
    const { container } = render(<Select options={options} />)

    const indicator = container.querySelector(".select__dropdown-indicator span")

    expect(indicator).toHaveStyle({ transform: "rotate(0deg)" })

    fireEvent.mouseDown(screen.getByRole("combobox"))

    expect(indicator).toHaveStyle({ transform: "rotate(180deg)" })
  })
})
