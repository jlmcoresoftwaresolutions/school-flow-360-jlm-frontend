import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, shadows, spacing } from "@/foundation"

import { DateInput } from "./DateInput"

const TODAY = new Date()

const openCalendar = (input: HTMLElement) => {
  fireEvent.focus(input)
  fireEvent.click(input)
}

// Outside-month days repeat the same day number in the grid, so the in-month one has to be singled
// out rather than matched by its text alone.
const pickDay = (container: HTMLElement, day: string) =>
  container.querySelector(`.react-datepicker__day--${day}:not(.react-datepicker__day--outside-month)`) as HTMLElement

describe("DateInput", () => {
  it("renders a text input", () => {
    render(<DateInput placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa").tagName).toBe("INPUT")
  })

  it("renders the title as a label associated with the input", () => {
    render(<DateInput title="Data de nascimento" />)

    const input = screen.getByLabelText("Data de nascimento")

    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
  })

  it("does not render a label when title is not provided", () => {
    const { container } = render(<DateInput />)

    expect(container.querySelector("label")).not.toBeInTheDocument()
  })

  it("renders helperText below the input", () => {
    render(<DateInput helperText="Use o formato dd/mm/aaaa." />)

    expect(screen.getByText("Use o formato dd/mm/aaaa.")).toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<DateInput className="custom" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<DateInput style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>()

    render(<DateInput ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it("formats the value prop using the default dd/MM/yyyy format", () => {
    render(<DateInput placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveValue("15/08/2026")
  })

  it("applies the dateFormat prop", () => {
    render(<DateInput dateFormat="yyyy-MM-dd" placeholder="aaaa-mm-dd" value={new Date(2026, 7, 15)} />)

    expect(screen.getByPlaceholderText("aaaa-mm-dd")).toHaveValue("2026-08-15")
  })

  it("opens the calendar when the input is clicked", () => {
    const { container } = render(<DateInput placeholder="dd/mm/aaaa" />)

    expect(container.querySelector(".react-datepicker")).not.toBeInTheDocument()

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))

    expect(container.querySelector(".react-datepicker")).toBeInTheDocument()
  })

  it("renders the calendar month name in pt-BR", () => {
    const { container } = render(<DateInput placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))

    expect(container.querySelector(".react-datepicker__current-month")).toHaveTextContent("agosto 2026")
  })

  it("shows the picked date when used without value or onChange", () => {
    const { container } = render(<DateInput placeholder="dd/mm/aaaa" value={undefined} />)

    const input = screen.getByPlaceholderText("dd/mm/aaaa")

    openCalendar(input)
    fireEvent.click(pickDay(container, "015"))

    expect(input).toHaveValue(`15/${String(TODAY.getMonth() + 1).padStart(2, "0")}/${TODAY.getFullYear()}`)
  })

  it("uses the defaultValue prop for uncontrolled usage", () => {
    render(<DateInput defaultValue={new Date(2026, 7, 15)} placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveValue("15/08/2026")
  })

  it("updates an uncontrolled value away from its defaultValue", () => {
    const { container } = render(<DateInput defaultValue={new Date(2026, 7, 15)} placeholder="dd/mm/aaaa" />)

    const input = screen.getByPlaceholderText("dd/mm/aaaa")

    openCalendar(input)
    fireEvent.click(pickDay(container, "020"))

    expect(input).toHaveValue("20/08/2026")
  })

  it("keeps a controlled value pinned to the value prop when a day is picked", () => {
    const handleChange = vi.fn()

    const { container } = render(
      <DateInput onChange={handleChange} placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />,
    )

    const input = screen.getByPlaceholderText("dd/mm/aaaa")

    openCalendar(input)
    fireEvent.click(pickDay(container, "020"))

    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue("15/08/2026")
  })

  it("calls onChange with the picked date", () => {
    const handleChange = vi.fn()

    const { container } = render(
      <DateInput onChange={handleChange} placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />,
    )

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))
    fireEvent.click(pickDay(container, "020"))

    expect(handleChange).toHaveBeenCalled()
    expect(handleChange.mock.calls[0][0]).toEqual(new Date(2026, 7, 20))
  })

  it("does not render days outside the minDate/maxDate range as selectable", () => {
    const { container } = render(
      <DateInput
        maxDate={new Date(2026, 7, 20)}
        minDate={new Date(2026, 7, 10)}
        placeholder="dd/mm/aaaa"
        value={new Date(2026, 7, 15)}
      />,
    )

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))

    expect(pickDay(container, "005")).toHaveClass("react-datepicker__day--disabled")
  })

  it("does not render a clear button when no date is selected", () => {
    render(<DateInput placeholder="dd/mm/aaaa" />)

    expect(screen.queryByLabelText("Limpar data selecionada")).not.toBeInTheDocument()
  })

  it("renders a clear button once a date is selected", () => {
    render(<DateInput placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    expect(screen.getByLabelText("Limpar data selecionada")).toBeInTheDocument()
  })

  it("does not render a clear button when disabled, even with a selected date", () => {
    render(<DateInput disabled placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    expect(screen.queryByLabelText("Limpar data selecionada")).not.toBeInTheDocument()
  })

  it("clears an uncontrolled value back to empty when the clear button is clicked", () => {
    render(<DateInput defaultValue={new Date(2026, 7, 15)} placeholder="dd/mm/aaaa" />)

    fireEvent.click(screen.getByLabelText("Limpar data selecionada"))

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveValue("")
    expect(screen.queryByLabelText("Limpar data selecionada")).not.toBeInTheDocument()
  })

  it("calls onChange with null when the clear button is clicked", () => {
    const handleChange = vi.fn()

    render(<DateInput onChange={handleChange} placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    fireEvent.click(screen.getByLabelText("Limpar data selecionada"))

    expect(handleChange).toHaveBeenCalledWith(null)
  })

  // react-datepicker closes the calendar on any mousedown outside of it, which fires before a
  // click handler's stopPropagation ever runs - fireEvent.mousedown here (rather than relying on
  // fireEvent.click to imply it) is what actually exercises that race.
  it("keeps the calendar open when the clear button is clicked while it is open", () => {
    const { container } = render(<DateInput placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))
    expect(container.querySelector(".react-datepicker")).toBeInTheDocument()

    const clearButton = screen.getByLabelText("Limpar data selecionada")

    fireEvent.mouseDown(clearButton)
    fireEvent.click(clearButton)

    expect(container.querySelector(".react-datepicker")).toBeInTheDocument()
  })

  it("positions the calendar aligned to the left edge of the input", () => {
    const { container } = render(<DateInput placeholder="dd/mm/aaaa" value={new Date(2026, 7, 15)} />)

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))

    expect(container.querySelector(".react-datepicker-popper")).toHaveAttribute("data-placement", "bottom-start")
  })

  it("defaults to the low border radius", () => {
    render(<DateInput placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveStyle({ borderRadius: borderRadiusLevels.low })
  })

  it("applies the borderRadius prop", () => {
    render(<DateInput borderRadius="high" placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("has a drop shadow by default", () => {
    render(<DateInput placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    render(<DateInput elevated={false} placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("respects the disabled prop", () => {
    render(<DateInput disabled title="Data de nascimento" />)

    expect(screen.getByLabelText("Data de nascimento")).toBeDisabled()
  })

  it("forwards the name prop to the input element", () => {
    render(<DateInput name="birthDate" placeholder="dd/mm/aaaa" />)

    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveAttribute("name", "birthDate")
  })

  it("makes helperText transparent while the calendar is open", () => {
    render(<DateInput helperText="Use o formato dd/mm/aaaa." placeholder="dd/mm/aaaa" />)

    const helperText = screen.getByText("Use o formato dd/mm/aaaa.")

    expect(helperText).toHaveStyle({ opacity: "1" })

    openCalendar(screen.getByPlaceholderText("dd/mm/aaaa"))

    expect(helperText).toHaveStyle({ opacity: "0" })
  })
})
