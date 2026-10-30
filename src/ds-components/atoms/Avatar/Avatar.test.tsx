import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { spacing } from "@/foundation"

import { Avatar } from "./Avatar"

describe("Avatar", () => {
  it("shows the initials as an image named by the person's name when there is no photo", () => {
    render(<Avatar name="Maria da Silva" />)

    expect(screen.getByRole("img", { name: "Maria da Silva" })).toHaveTextContent("MS")
  })

  it("shows the photo, with the name as its alt text, when src is given", () => {
    render(<Avatar name="Maria da Silva" src="/maria.png" />)

    const photo = screen.getByRole("img", { name: "Maria da Silva" })
    expect(photo).toHaveAttribute("src", "/maria.png")
    expect(screen.queryByText("MS")).not.toBeInTheDocument()
  })

  it("is hidden from screen readers when decorative", () => {
    const { container } = render(
      <>
        <Avatar name="Maria da Silva" decorative />
        <Avatar name="João Souza" src="/joao.png" decorative />
      </>,
    )

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByText("MS")).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("is 40px by default and follows the size prop", () => {
    render(
      <>
        <Avatar name="Maria da Silva" />
        <Avatar name="João Souza" size="lg" />
      </>,
    )

    expect(screen.getByRole("img", { name: "Maria da Silva" })).toHaveStyle({ height: spacing[40], width: spacing[40] })
    expect(screen.getByRole("img", { name: "João Souza" })).toHaveStyle({ height: spacing[48], width: spacing[48] })
  })

  it("forwards className and style", () => {
    render(<Avatar className="custom" name="Maria da Silva" style={{ margin: "4px" }} />)

    expect(screen.getByRole("img")).toHaveClass("custom")
    expect(screen.getByRole("img")).toHaveStyle({ margin: "4px" })
  })
})
