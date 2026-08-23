import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { spacing } from "@/foundation"

import { FileUpload } from "./FileUpload"

describe("FileUpload", () => {
  it("renders a file input", () => {
    const { container } = render(<FileUpload />)

    expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it("renders the title as a label associated with the file input", () => {
    render(<FileUpload title="Comprovante de residência" />)

    const input = screen.getByLabelText("Comprovante de residência")

    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
  })

  it("does not render title text when it is not provided", () => {
    render(<FileUpload />)

    expect(screen.queryByText("Comprovante de residência")).not.toBeInTheDocument()
  })

  it("shows a default placeholder before any file is selected", () => {
    render(<FileUpload />)

    expect(screen.getByText("Clique para selecionar um arquivo")).toBeInTheDocument()
  })

  it("renders helperText below the drop zone", () => {
    render(<FileUpload helperText="Formatos aceitos: PDF, JPG ou PNG." />)

    expect(screen.getByText("Formatos aceitos: PDF, JPG ou PNG.")).toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<FileUpload className="custom" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<FileUpload style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>()

    render(<FileUpload ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it("shows the selected file name and forwards onChange", () => {
    const handleChange = vi.fn()
    const file = new File(["conteudo"], "documento.pdf", { type: "application/pdf" })

    const { container } = render(<FileUpload onChange={handleChange} />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText("documento.pdf")).toBeInTheDocument()
    expect(handleChange).toHaveBeenCalled()
  })

  it("joins multiple selected file names", () => {
    const fileA = new File(["a"], "rg.pdf", { type: "application/pdf" })
    const fileB = new File(["b"], "cpf.pdf", { type: "application/pdf" })

    const { container } = render(<FileUpload multiple />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [fileA, fileB] } })

    expect(screen.getByText("rg.pdf, cpf.pdf")).toBeInTheDocument()
  })

  it("forwards the accept attribute", () => {
    const { container } = render(<FileUpload accept="application/pdf" />)

    expect(container.querySelector('input[type="file"]')).toHaveAttribute("accept", "application/pdf")
  })

  it("respects the disabled attribute", () => {
    render(<FileUpload disabled title="Comprovante de residência" />)

    expect(screen.getByLabelText("Comprovante de residência")).toBeDisabled()
  })
})
