import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { spacing } from "@/foundation"

import { Grid } from "./Grid"

const halfGutterStyle = (gutterWidth: number) => `${-gutterWidth / 2}px`

const defaultGutterWidth = Number.parseInt(spacing[24], 10)
const defaultHalfGutter = halfGutterStyle(defaultGutterWidth)
const noGutterWidth = Number.parseInt(spacing[0], 10)
const noHalfGutter = halfGutterStyle(noGutterWidth)

describe("Grid", () => {
  describe("Container", () => {
    it("renders children inside a div", () => {
      render(<Grid.Container>Content</Grid.Container>)

      const element = screen.getByText("Content")

      expect(element.tagName).toBe("DIV")
    })

    it("applies the className passed as a prop", () => {
      render(<Grid.Container className="custom">Content</Grid.Container>)

      const element = screen.getByText("Content")

      expect(element).toHaveClass("custom")
    })
  })

  describe("Row", () => {
    it("renders children inside a div", () => {
      render(<Grid.Row>Content</Grid.Row>)

      const element = screen.getByText("Content")

      expect(element.tagName).toBe("DIV")
    })

    it("applies a default gutter width derived from the spacing tokens", () => {
      render(<Grid.Row>Content</Grid.Row>)

      const element = screen.getByText("Content")

      expect(element).toHaveStyle({ marginLeft: defaultHalfGutter, marginRight: defaultHalfGutter })
    })

    it("honors an explicit gutterWidth prop over the default", () => {
      render(<Grid.Row gutterWidth={noGutterWidth}>Content</Grid.Row>)

      const element = screen.getByText("Content")

      expect(element).toHaveStyle({ marginLeft: noHalfGutter, marginRight: noHalfGutter })
    })
  })

  describe("Col", () => {
    it("renders children inside a div", () => {
      render(<Grid.Col>Content</Grid.Col>)

      const element = screen.getByText("Content")

      expect(element.tagName).toBe("DIV")
    })

    it("applies the className passed as a prop", () => {
      render(<Grid.Col className="custom">Content</Grid.Col>)

      const element = screen.getByText("Content")

      expect(element).toHaveClass("custom")
    })
  })
})
