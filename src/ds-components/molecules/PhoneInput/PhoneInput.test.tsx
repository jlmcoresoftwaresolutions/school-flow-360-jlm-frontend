import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { colors, spacing } from "@/foundation"

import { PhoneInput, type PhoneInputProps } from "./PhoneInput"

// A controlled field, as a form uses it.
const Controlled = (props: Partial<PhoneInputProps> & { onValue?: (value: string) => void }) => {
  const { onValue, value: initialValue = "", ...rest } = props

  const [value, setValue] = useState(initialValue)

  return (
    <PhoneInput
      title="Telefone"
      {...rest}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
      value={value}
    />
  )
}

const chooseCountry = (name: RegExp) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "País do telefone" }), { key: "ArrowDown" })
  fireEvent.click(screen.getByText(name))
}

describe("PhoneInput", () => {
  it("renders the title as the label of the number", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("Telefone")).toHaveAttribute("type", "tel")
  })

  it("starts with Brazil selected and formats the number the Brazilian way", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    expect(screen.getByText("BR +55")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "8533331100" } })

    expect(screen.getByLabelText("Telefone")).toHaveValue("(85) 3333-1100")
    expect(onValue).toHaveBeenLastCalledWith("+55 85 3333 1100")
  })

  it("formats and saves the number of the country chosen before typing", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    chooseCountry(/^Portugal \(\+351\)$/)
    expect(screen.getByText("PT +351")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "912345678" } })

    expect(screen.getByLabelText("Telefone")).toHaveValue("912 345 678")
    expect(onValue).toHaveBeenLastCalledWith("+351 912 345 678")
  })

  it("moves a typed number to another country when the country changes", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} value="+55 85 3333 1100" />)

    chooseCountry(/^Portugal \(\+351\)$/)

    expect(onValue).toHaveBeenLastCalledWith(expect.stringMatching(/^\+351 /))
  })

  it("picks the country of a whole number pasted with + and its calling code", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+16502530000" } })

    expect(screen.getByText("US +1")).toBeInTheDocument()
    expect(screen.getByLabelText("Telefone")).toHaveValue("(650) 253-0000")
    expect(onValue).toHaveBeenLastCalledWith("+1 650 253 0000")
  })

  it("reads a saved number into its country and national part", () => {
    render(<Controlled value="+351 912 345 678" />)

    expect(screen.getByText("PT +351")).toBeInTheDocument()
    expect(screen.getByLabelText("Telefone")).toHaveValue("912 345 678")
  })

  it("selects the defaultCountry while the number is empty", () => {
    render(<Controlled defaultCountry="PT" />)

    expect(screen.getByText("PT +351")).toBeInTheDocument()
  })

  it("hands out an empty value when the number is erased", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} value="+55 85 3333 1100" />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "" } })

    expect(onValue).toHaveBeenLastCalledWith("")
  })

  it("names the countries in the given language and finds one by its name", () => {
    render(<Controlled language="en" />)

    const country = screen.getByRole("combobox", { name: "País do telefone" })
    fireEvent.change(country, { target: { value: "Germ" } })

    expect(screen.getByText("Germany (+49)")).toBeInTheDocument()
  })

  it("uses the countryLabel and noOptionsMessage props", () => {
    render(<Controlled countryLabel="Country" noOptionsMessage="No country" />)

    const country = screen.getByRole("combobox", { name: "Country" })
    fireEvent.change(country, { target: { value: "zzzz" } })

    expect(screen.getByText("No country")).toBeInTheDocument()
  })

  it("describes the number with the helper text", () => {
    render(<Controlled helperText="Com o DDD." />)

    expect(screen.getByLabelText("Telefone")).toHaveAccessibleDescription("Com o DDD.")
  })

  it("marks the number invalid and describes it with the error", () => {
    render(<Controlled error="Telefone inválido." helperText="Com o DDD." />)

    const input = screen.getByLabelText("Telefone")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Telefone inválido.")
    expect(input).toHaveStyle({ borderColor: colors.danger[500] })
  })

  it("marks the number required", () => {
    render(<Controlled required />)

    expect(screen.getByRole("textbox", { name: /Telefone/ })).toBeRequired()
  })

  it("disables the country and the number", () => {
    render(<Controlled id="phone" disabled />)

    expect(screen.getByLabelText("Telefone")).toBeDisabled()
    expect(document.getElementById("phone-country")).toBeDisabled()
  })

  it("shows the placeholder in the number", () => {
    render(<Controlled placeholder="Digite o telefone" />)

    expect(screen.getByPlaceholderText("Digite o telefone")).toBeInTheDocument()
  })

  it("uses the small size", () => {
    render(<Controlled size="small" />)

    expect(screen.getByLabelText("Telefone")).toHaveStyle({ padding: spacing[8] })
  })

  it("applies className and style to the wrapper", () => {
    const { container } = render(<Controlled className="custom" style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveClass("custom")
    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards the name and the id to the number", () => {
    render(<Controlled id="phone" name="phone" />)

    const input = screen.getByLabelText("Telefone")
    expect(input).toHaveAttribute("id", "phone")
    expect(input).toHaveAttribute("name", "phone")
  })
})
