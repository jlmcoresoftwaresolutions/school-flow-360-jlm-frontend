import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createRef } from "react"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, shadows, spacing, typography } from "@/foundation"

import { Input } from "./Input"

describe("Input", () => {
  it("renders a text input", () => {
    render(<Input />)

    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("renders the title as a label associated with the input", () => {
    render(<Input title="Email" />)

    const input = screen.getByLabelText("Email")

    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
  })

  it("does not render a label when title is not provided", () => {
    render(<Input />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(document.querySelector("label")).not.toBeInTheDocument()
  })

  it("renders helperText below the input", () => {
    render(<Input helperText="We'll never share your email" />)

    expect(screen.getByText("We'll never share your email")).toBeInTheDocument()
  })

  it("does not render helperText when it is not provided", () => {
    const { container } = render(<Input />)

    expect(container.querySelector("span")).not.toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Input className="custom" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Input style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>()

    render(<Input ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it("forwards native input props like placeholder, value and onChange", () => {
    const handleChange = vi.fn()

    render(<Input onChange={handleChange} placeholder="Type here" value="hello" />)

    const input = screen.getByPlaceholderText("Type here")

    expect(input).toHaveValue("hello")

    fireEvent.change(input, { target: { value: "world" } })

    expect(handleChange).toHaveBeenCalled()
  })

  it("uses a medium font size", () => {
    render(<Input placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount")

    expect(input).toHaveStyle({ fontSize: `${typography.fontSize.md}px` })
  })

  it("defaults to the medium border radius", () => {
    render(<Input placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount")

    expect(input).toHaveStyle({ borderRadius: borderRadiusLevels.medium })
  })

  it("applies the borderRadius prop", () => {
    render(<Input borderRadius="high" placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount")

    expect(input).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("has a drop shadow by default", () => {
    render(<Input placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    render(<Input elevated={false} placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("respects the disabled attribute", () => {
    render(<Input disabled title="Email" />)

    expect(screen.getByLabelText("Email")).toBeDisabled()
  })

  it("strips non-digit characters when numeric is true", () => {
    const handleChange = vi.fn()

    render(<Input numeric onChange={handleChange} placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount") as HTMLInputElement

    fireEvent.change(input, { target: { value: "12a3b4" } })

    expect(input.value).toBe("1234")
    expect(handleChange).toHaveBeenCalled()
  })

  it("does not restrict input when numeric is not set", () => {
    render(<Input placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount") as HTMLInputElement

    fireEvent.change(input, { target: { value: "12a3b4" } })

    expect(input.value).toBe("12a3b4")
  })

  it("sets inputmode and pattern hints when numeric is true", () => {
    render(<Input numeric placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount")

    expect(input).toHaveAttribute("inputmode", "numeric")
    expect(input).toHaveAttribute("pattern", "[0-9]*")
  })

  it("supports a CVV field via numeric plus the native maxLength attribute, without a dedicated mask", () => {
    render(<Input maxLength={3} numeric placeholder="CVV" />)

    const input = screen.getByPlaceholderText("CVV") as HTMLInputElement

    expect(input).toHaveAttribute("maxlength", "3")

    fireEvent.change(input, { target: { value: "12a3" } })

    expect(input.value).toBe("123")
  })

  it("formats the value as a CEP while typing", () => {
    render(<Input mask="cep" placeholder="CEP" />)

    const input = screen.getByPlaceholderText("CEP") as HTMLInputElement

    fireEvent.change(input, { target: { value: "12345678" } })

    expect(input.value).toBe("12345-678")
  })

  it("formats the value as a credit card number while typing", () => {
    render(<Input mask="creditCard" placeholder="Card number" />)

    const input = screen.getByPlaceholderText("Card number") as HTMLInputElement

    fireEvent.change(input, { target: { value: "1234567890123456" } })

    expect(input.value).toBe("1234 5678 9012 3456")
  })

  it("formats the value as BRL currency while typing", () => {
    render(<Input mask="currency" placeholder="Amount" />)

    const input = screen.getByPlaceholderText("Amount") as HTMLInputElement

    fireEvent.change(input, { target: { value: "1234567" } })

    expect(input.value).toBe("R$ 12.345,67")
  })

  it("formats the value as a card expiry date while typing", () => {
    render(<Input mask="expiry" placeholder="MM/AA" />)

    const input = screen.getByPlaceholderText("MM/AA") as HTMLInputElement

    fireEvent.change(input, { target: { value: "1228" } })

    expect(input.value).toBe("12/28")
  })

  it("formats the value as a CPF while typing", () => {
    render(<Input mask="cpf" placeholder="CPF" />)

    const input = screen.getByPlaceholderText("CPF") as HTMLInputElement

    fireEvent.change(input, { target: { value: "11144477735" } })

    expect(input.value).toBe("111.444.777-35")
  })

  it("formats the value as a CNPJ while typing", () => {
    render(<Input mask="cnpj" placeholder="CNPJ" />)

    const input = screen.getByPlaceholderText("CNPJ") as HTMLInputElement

    fireEvent.change(input, { target: { value: "11222333000181" } })

    expect(input.value).toBe("11.222.333/0001-81")
  })

  it("formats the value as a phone number while typing", () => {
    render(<Input mask="phone" placeholder="Phone" />)

    const input = screen.getByPlaceholderText("Phone") as HTMLInputElement

    fireEvent.change(input, { target: { value: "11987654321" } })

    expect(input.value).toBe("(11) 98765-4321")
  })

  it("ignores non-digit characters typed alongside a mask", () => {
    render(<Input mask="cpf" placeholder="CPF" />)

    const input = screen.getByPlaceholderText("CPF") as HTMLInputElement

    fireEvent.change(input, { target: { value: "111a444b777c35" } })

    expect(input.value).toBe("111.444.777-35")
  })

  it("mask takes precedence over numeric when both are set", () => {
    render(<Input mask="cpf" numeric placeholder="CPF" />)

    const input = screen.getByPlaceholderText("CPF") as HTMLInputElement

    fireEvent.change(input, { target: { value: "11144477735" } })

    expect(input.value).toBe("111.444.777-35")
  })

  it("keeps only digits when numeric is used together with react-hook-form", async () => {
    const handleSubmit = vi.fn()

    const Form = () => {
      const form = useForm<{ amount: string }>()

      return (
        <form
          onSubmit={form.handleSubmit((data) => {
            handleSubmit(data)
          })}
        >
          <Input numeric title="Amount" {...form.register("amount")} />
          <button type="submit">Submit</button>
        </form>
      )
    }

    render(<Form />)

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1a2b3" } })
    fireEvent.click(screen.getByText("Submit"))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({ amount: "123" })
    })
  })

  it("works when registered with react-hook-form", async () => {
    const handleSubmit = vi.fn()

    const Form = () => {
      const form = useForm<{ email: string }>()

      return (
        <form
          onSubmit={form.handleSubmit((data) => {
            handleSubmit(data)
          })}
        >
          <Input title="Email" {...form.register("email")} />
          <button type="submit">Submit</button>
        </form>
      )
    }

    render(<Form />)

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
    fireEvent.click(screen.getByText("Submit"))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({ email: "user@example.com" })
    })
  })
})
