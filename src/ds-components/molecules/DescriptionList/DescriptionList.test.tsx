import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DescriptionList } from "./DescriptionList"

describe("DescriptionList", () => {
  it("renders each item as a term and its description, in order", () => {
    const { container } = render(
      <DescriptionList
        items={[
          { key: "nome", label: "Nome", value: "Unidade Aldeota" },
          { key: "telefone", label: "Telefone", value: "(85) 3333-1100" },
        ]}
      />,
    )

    expect(container.querySelector("dl")).toBeInTheDocument()
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(["Nome", "Telefone"])
    expect(screen.getAllByRole("definition").map((value) => value.textContent)).toEqual([
      "Unidade Aldeota",
      "(85) 3333-1100",
    ])
  })

  it("renders a component as a value", () => {
    render(<DescriptionList items={[{ key: "situacao", label: "Situação", value: <strong>Ativa</strong> }]} />)

    expect(screen.getByRole("definition").querySelector("strong")).toHaveTextContent("Ativa")
  })

  it('shows "Não informado" for an empty, blank or missing value', () => {
    render(
      <DescriptionList
        items={[
          { key: "a", label: "A", value: "" },
          { key: "b", label: "B", value: "   " },
          { key: "c", label: "C" },
          { key: "d", label: "D", value: 0 },
        ]}
      />,
    )

    expect(screen.getAllByRole("definition").map((value) => value.textContent)).toEqual([
      "Não informado",
      "Não informado",
      "Não informado",
      "0",
    ])
  })

  it("uses emptyValue for missing values when given", () => {
    render(<DescriptionList emptyValue="Not provided" items={[{ key: "a", label: "A" }]} />)

    expect(screen.getByRole("definition")).toHaveTextContent("Not provided")
  })

  it("forwards className and style to the list", () => {
    const { container } = render(
      <DescriptionList className="custom" items={[{ key: "a", label: "A", value: "x" }]} style={{ margin: "4px" }} />,
    )

    expect(container.querySelector("dl")).toHaveClass("custom")
    expect(container.querySelector("dl")).toHaveStyle({ margin: "4px" })
  })
})
