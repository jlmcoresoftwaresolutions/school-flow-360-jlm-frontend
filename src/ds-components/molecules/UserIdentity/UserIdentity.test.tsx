import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UserIdentity } from "./UserIdentity"

// jsdom has no matchMedia, so hideTextOnNarrowScreens's media rule can't be exercised here.
describe("UserIdentity", () => {
  it("shows the name and the role", () => {
    render(<UserIdentity name="Maria Silva" role="Diretora" />)

    expect(screen.getByText("Maria Silva")).toBeInTheDocument()
    expect(screen.getByText("Diretora")).toBeInTheDocument()
  })

  it("omits the role when none is given", () => {
    const { container } = render(<UserIdentity name="Maria da Silva" />)

    expect(container).toHaveTextContent(/^MSMaria Silva$/)
  })

  it("shows only the first and last names by default, with the whole name as the hover title", () => {
    render(<UserIdentity name="Maria Aparecida dos Santos Oliveira" />)

    expect(screen.getByText("Maria Oliveira")).toHaveAttribute("title", "Maria Aparecida dos Santos Oliveira")
  })

  it("adds no title when the name is already short", () => {
    render(<UserIdentity name="Maria Oliveira" />)

    expect(screen.getByText("Maria Oliveira")).not.toHaveAttribute("title")
  })

  it("shows the whole name with fullName", () => {
    render(<UserIdentity name="Maria Aparecida dos Santos Oliveira" fullName />)

    expect(screen.getByText("Maria Aparecida dos Santos Oliveira")).not.toHaveAttribute("title")
  })

  it("shows a decorative avatar, so the name isn't announced twice", () => {
    render(<UserIdentity name="Maria da Silva" />)

    expect(screen.getByText("MS")).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("shows the photo, with an empty alt, when avatarSrc is given", () => {
    const { container } = render(<UserIdentity avatarSrc="/maria.png" name="Maria da Silva" />)

    expect(container.querySelector("img")).toHaveAttribute("src", "/maria.png")
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("renders only inline elements, so it can sit inside a button", () => {
    const { container } = render(<UserIdentity name="Maria da Silva" role="Diretora" />)

    expect(container.querySelector("div")).not.toBeInTheDocument()
  })

  it("forwards className and style to the root element", () => {
    const { container } = render(<UserIdentity className="custom" name="Maria da Silva" style={{ margin: "4px" }} />)

    expect(container.firstElementChild).toHaveClass("custom")
    expect(container.firstElementChild).toHaveStyle({ margin: "4px" })
  })
})
