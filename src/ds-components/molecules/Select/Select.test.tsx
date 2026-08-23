import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, shadows, spacing } from "@/foundation"

import { Select } from "./Select"

const options = [
  { label: "Manhã", value: "manha" },
  { label: "Tarde", value: "tarde" },
]

describe("Select", () => {
  it("renders a select with the given options", () => {
    render(<Select options={options} />)

    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Manhã" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Tarde" })).toBeInTheDocument()
  })

  it("renders a disabled placeholder option when placeholder is provided", () => {
    render(<Select options={options} placeholder="Selecione..." />)

    expect(screen.getByRole("option", { name: "Selecione..." })).toBeDisabled()
  })

  it("does not render a placeholder option when placeholder is not provided", () => {
    render(<Select options={options} />)

    expect(screen.queryByText("Selecione...")).not.toBeInTheDocument()
  })

  it("renders the title as a label associated with the select", () => {
    render(<Select options={options} title="Turno" />)

    const select = screen.getByLabelText("Turno")

    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe("SELECT")
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

  it("forwards a ref to the underlying select element", () => {
    const ref = createRef<HTMLSelectElement>()

    render(<Select options={options} ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })

  it("forwards native select props like value and onChange", () => {
    const handleChange = vi.fn()

    render(<Select onChange={handleChange} options={options} title="Turno" value="manha" />)

    const select = screen.getByLabelText("Turno") as HTMLSelectElement

    expect(select.value).toBe("manha")

    fireEvent.change(select, { target: { value: "tarde" } })

    expect(handleChange).toHaveBeenCalled()
  })

  it("defaults to the medium border radius", () => {
    render(<Select options={options} title="Turno" />)

    expect(screen.getByLabelText("Turno")).toHaveStyle({ borderRadius: borderRadiusLevels.medium })
  })

  it("applies the borderRadius prop", () => {
    render(<Select borderRadius="high" options={options} title="Turno" />)

    expect(screen.getByLabelText("Turno")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("has a drop shadow by default", () => {
    render(<Select options={options} title="Turno" />)

    expect(screen.getByLabelText("Turno")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    render(<Select elevated={false} options={options} title="Turno" />)

    expect(screen.getByLabelText("Turno")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("respects the disabled attribute", () => {
    render(<Select disabled options={options} title="Turno" />)

    expect(screen.getByLabelText("Turno")).toBeDisabled()
  })
})
