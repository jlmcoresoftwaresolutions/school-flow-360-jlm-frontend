import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Table } from "./Table"

type Student = {
  id: number
  name: string
  schoolClass: string
}

const students: Student[] = [
  { id: 1, name: "Beatriz", schoolClass: "9º A" },
  { id: 2, name: "Ana", schoolClass: "8º B" },
  { id: 3, name: "Carlos", schoolClass: "7º C" },
]

describe("Table", () => {
  it("renders a header cell for each column", () => {
    render(
      <Table value={students}>
        <Table.Column field="name" header="Nome" />
        <Table.Column field="schoolClass" header="Turma" />
      </Table>,
    )

    expect(screen.getByRole("columnheader", { name: "Nome" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Turma" })).toBeInTheDocument()
  })

  it("renders a row for each item in value", () => {
    render(
      <Table value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Beatriz")).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
    expect(screen.getByText("Carlos")).toBeInTheDocument()
  })

  it("renders a column's body renderer instead of the raw field value", () => {
    render(
      <Table value={students}>
        <Table.Column body={(student) => `Turma: ${student.schoolClass}`} field="schoolClass" header="Turma" />
      </Table>,
    )

    expect(screen.getByText("Turma: 9º A")).toBeInTheDocument()
  })

  it("shows the emptyMessage when value is empty", () => {
    render(
      <Table emptyMessage="Nenhum aluno encontrado." value={[]}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Nenhum aluno encontrado.")).toBeInTheDocument()
  })

  it("shows a loading row instead of the data rows when loading is set", () => {
    render(
      <Table loading value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Carregando...")).toBeInTheDocument()
    expect(screen.queryByText("Beatriz")).not.toBeInTheDocument()
  })

  it("sorts ascending, then descending, then back to unsorted when a sortable header is clicked repeatedly", () => {
    render(
      <Table value={students}>
        <Table.Column field="name" header="Nome" sortable />
      </Table>,
    )

    const getNames = () => screen.getAllByRole("cell").map((cell) => cell.textContent)
    const header = screen.getByRole("columnheader", { name: "Nome" })

    expect(getNames()).toEqual(["Beatriz", "Ana", "Carlos"])

    fireEvent.click(header)
    expect(getNames()).toEqual(["Ana", "Beatriz", "Carlos"])

    fireEvent.click(header)
    expect(getNames()).toEqual(["Carlos", "Beatriz", "Ana"])

    fireEvent.click(header)
    expect(getNames()).toEqual(["Beatriz", "Ana", "Carlos"])
  })

  it("does not sort when clicking a non-sortable header", () => {
    render(
      <Table value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    const getNames = () => screen.getAllByRole("cell").map((cell) => cell.textContent)

    fireEvent.click(screen.getByRole("columnheader", { name: "Nome" }))

    expect(getNames()).toEqual(["Beatriz", "Ana", "Carlos"])
  })

  it("paginates value into pages of rows items, navigable via the footer buttons", () => {
    render(
      <Table paginator rows={2} value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Beatriz")).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
    expect(screen.queryByText("Carlos")).not.toBeInTheDocument()
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }))

    expect(screen.getByText("Carlos")).toBeInTheDocument()
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }))

    expect(screen.getByText("Beatriz")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
  })

  it("does not render the paginator footer when paginator is not set", () => {
    render(
      <Table value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument()
  })

  it("numbers the page buttons and marks the current page", () => {
    render(
      <Table paginator rows={1} value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page")

    fireEvent.click(screen.getByRole("button", { name: "Página 3" }))

    expect(screen.getByText("Carlos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Página 3" })).toHaveAttribute("aria-current", "page")
  })

  it("replaces the paginator copy with the label props", () => {
    render(
      <Table
        nextPageLabel="Next"
        pageLabel={(page) => `Page ${page}`}
        pageSummary={(page, totalPages) => `Page ${page} of ${totalPages}`}
        paginator
        previousPageLabel="Previous"
        rows={2}
        value={students}
      >
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Page 2" })).toBeInTheDocument()
  })

  it("shows loadingMessage in the loading row", () => {
    render(
      <Table loading loadingMessage="Loading..." value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("applies the className passed as a prop", () => {
    const { container } = render(
      <Table className="custom" value={students}>
        <Table.Column field="name" header="Nome" />
      </Table>,
    )

    expect(container.firstChild).toHaveClass("custom")
  })
})
