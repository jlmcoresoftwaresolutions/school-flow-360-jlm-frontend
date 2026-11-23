import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Código do país (DDI)" }), { key: "ArrowDown" })
  fireEvent.click(screen.getByText(name))
}

// The browser's languages, which tell the country of whoever uses the field (jsdom says en-US).
const mockLanguages = (languages: string[]) => vi.spyOn(navigator, "languages", "get").mockReturnValue(languages)

describe("PhoneInput", () => {
  beforeEach(() => {
    mockLanguages(["pt-BR"])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the title as the label of the number", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("Telefone")).toHaveAttribute("type", "tel")
  })

  it("starts with the country of whoever uses it, from the browser's languages", () => {
    mockLanguages(["pt-PT", "en"])
    render(<Controlled />)

    expect(screen.getByTitle("Portugal")).toHaveTextContent("+351")
  })

  it("shows the selected country closed as its flag and calling code, named on hover", async () => {
    render(<Controlled />)

    const selected = screen.getByTitle("Brasil")
    expect(selected).toHaveTextContent(/^\+55$/)
    await waitFor(() => expect(selected.querySelector("svg")).not.toBeNull())
  })

  it("marks the country search for password managers to leave alone, and the number as a phone", () => {
    render(<Controlled />)

    const search = screen.getByRole("combobox", { name: "Código do país (DDI)" })
    expect(search).toHaveAttribute("data-1p-ignore", "true")
    expect(search).toHaveAttribute("data-lpignore", "true")
    expect(search).toHaveAttribute("data-bwignore", "true")
    expect(search).toHaveAttribute("data-form-type", "other")
    expect(search).toHaveAttribute("type", "search")
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("autocomplete", "tel-national")
  })

  it("sizes the country selector to the calling code", () => {
    const { container } = render(<Controlled value="+351 912 345 678" />)

    // The selector's box: the parent of react-select's container, the parent of its control.
    const selector = container.querySelector(".select__control")?.parentElement?.parentElement as Element
    expect(getComputedStyle(selector).width).toContain("4ch")

    chooseCountry(/^Estados Unidos \(\+1\)$/)
    expect(getComputedStyle(selector).width).toContain("2ch")
  })

  it("formats the number the way the selected country writes it", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "8533331100" } })

    expect(screen.getByLabelText("Telefone")).toHaveValue("(85) 3333-1100")
    expect(onValue).toHaveBeenLastCalledWith("+55 85 3333 1100")
  })

  it("never takes more digits than the selected country's numbers have", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "859999900001234" } })

    expect(screen.getByLabelText("Telefone")).toHaveValue("(85) 99999-0000")
    expect(onValue).toHaveBeenLastCalledWith("+55 85 99999 0000")
  })

  it("shows an example number of the selected country as the placeholder", () => {
    render(<Controlled />)

    expect(screen.getByLabelText("Telefone")).toHaveAttribute("placeholder", "(11) 96123-4567")
    chooseCountry(/^Portugal \(\+351\)$/)
    expect(screen.getByLabelText("Telefone")).toHaveAttribute("placeholder", "912 345 678")
  })

  it("formats and saves the number of the country chosen before typing", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    chooseCountry(/^Portugal \(\+351\)$/)
    expect(screen.getByTitle("Portugal")).toHaveTextContent("+351")
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "912345678" } })

    expect(screen.getByLabelText("Telefone")).toHaveValue("912 345 678")
    expect(onValue).toHaveBeenLastCalledWith("+351 912 345 678")
  })

  it("clears the number when another country is chosen", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} value="+55 85 3333 1100" />)

    chooseCountry(/^Portugal \(\+351\)$/)

    expect(screen.getByLabelText("Telefone")).toHaveValue("")
    expect(onValue).toHaveBeenLastCalledWith("")
  })

  it("picks the country of a whole number pasted with + and its calling code", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+16502530000" } })

    expect(screen.getByTitle("Estados Unidos")).toHaveTextContent("+1")
    expect(screen.getByLabelText("Telefone")).toHaveValue("(650) 253-0000")
    expect(onValue).toHaveBeenLastCalledWith("+1 650 253 0000")
  })

  it("shows each country's flag beside its name in the open list", async () => {
    render(<Controlled />)

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Código do país (DDI)" }), { key: "ArrowDown" })

    const option = screen.getByText(/^Portugal \(\+351\)$/)
    await waitFor(() => expect(option.querySelector("svg")).not.toBeNull())
    expect(option.querySelector("[aria-hidden='true']")).not.toBeNull()
  })

  it("reads a saved number into its country and national part", () => {
    render(<Controlled value="+351 912 345 678" />)

    expect(screen.getByTitle("Portugal")).toHaveTextContent("+351")
    expect(screen.getByLabelText("Telefone")).toHaveValue("912 345 678")
  })

  it("selects the defaultCountry while the number is empty, over the browser's", () => {
    render(<Controlled defaultCountry="PT" />)

    expect(screen.getByTitle("Portugal")).toHaveTextContent("+351")
  })

  it("hands out an empty value when the number is erased", () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} value="+55 85 3333 1100" />)

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "" } })

    expect(onValue).toHaveBeenLastCalledWith("")
  })

  it("names the countries in the given language and finds one by its name", () => {
    render(<Controlled language="en" />)

    const country = screen.getByRole("combobox", { name: "Código do país (DDI)" })
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

  it("shows the placeholder given instead of the example", () => {
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
