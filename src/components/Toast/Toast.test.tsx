import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Toast } from "./Toast"
import { toast } from "./toastTrigger"

describe("Toast", () => {
  it("renders no toast before one is fired", () => {
    render(<Toast />)

    expect(screen.queryByText("Aluno matriculado com sucesso!")).not.toBeInTheDocument()
  })

  it("renders a toast fired via the toast function", () => {
    render(<Toast />)

    act(() => {
      toast("Aluno matriculado com sucesso!")
    })

    expect(screen.getByText("Aluno matriculado com sucesso!")).toBeInTheDocument()
  })

  it("applies the success type as a modifier class", () => {
    const { container } = render(<Toast />)

    act(() => {
      toast.success("Aluno matriculado com sucesso!")
    })

    expect(container.querySelector(".Toastify__toast--success")).toBeInTheDocument()
  })

  it("applies the error type as a modifier class", () => {
    const { container } = render(<Toast />)

    act(() => {
      toast.error("Não foi possível salvar o boletim.")
    })

    expect(container.querySelector(".Toastify__toast--error")).toBeInTheDocument()
  })

  it("defaults to the top-right position", () => {
    const { container } = render(<Toast />)

    act(() => {
      toast("Aluno matriculado com sucesso!")
    })

    expect(container.querySelector(".Toastify__toast-container--top-right")).toBeInTheDocument()
  })

  it("applies the position prop", () => {
    const { container } = render(<Toast position="bottom-left" />)

    act(() => {
      toast("Aluno matriculado com sucesso!")
    })

    expect(container.querySelector(".Toastify__toast-container--bottom-left")).toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Toast className="custom" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Toast style={{ opacity: 0.9 }} />)

    expect(container.firstChild).toHaveStyle({ opacity: 0.9 })
  })

  // Regression test: react-toastify only sets the type icon's fill to "currentColor" (matching
  // the toast's own text color) when it receives theme="colored" - passing that prop through
  // styled(ToastContainer) instead of straight to react-toastify's own ToastContainer silently
  // swallows it (styled-components reserves "theme" for its own ThemeProvider context), which
  // made the icon fall back to react-toastify's unset --toastify-icon-color-* CSS variables.
  it("colors the type icon to match the toast's text instead of react-toastify's default", () => {
    const { container } = render(<Toast />)

    act(() => {
      toast.success("Aluno matriculado com sucesso!")
    })

    const icon = container.querySelector(".Toastify__toast-icon svg")

    expect(icon).toHaveAttribute("fill", "currentColor")
  })
})
