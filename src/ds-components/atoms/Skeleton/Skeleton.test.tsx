import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { colors, spacing } from "@/foundation"

import { Skeleton } from "./Skeleton"

const renderSkeleton = (props: Parameters<typeof Skeleton>[0] = {}) => {
  const { container } = render(<Skeleton {...props} />)

  return container.firstElementChild as HTMLElement
}

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    expect(renderSkeleton()).toHaveAttribute("aria-hidden", "true")
  })

  it("defaults to a full-width text line", () => {
    expect(renderSkeleton()).toHaveStyle({ height: spacing[16], width: "100%" })
  })

  it("uses the neutral placeholder color", () => {
    expect(renderSkeleton()).toHaveStyle({ backgroundColor: colors.neutral[200] })
  })

  it("defaults the rect variant to a taller block", () => {
    expect(renderSkeleton({ variant: "rect" })).toHaveStyle({ height: spacing[64], width: "100%" })
  })

  it("defaults the circle variant to a square with a fully round radius", () => {
    expect(renderSkeleton({ variant: "circle" })).toHaveStyle({
      borderRadius: "9999px",
      height: spacing[40],
      width: spacing[40],
    })
  })

  it("sizes both sides of a circle from the one that is given", () => {
    expect(renderSkeleton({ height: spacing[24], variant: "circle" })).toHaveStyle({
      height: spacing[24],
      width: spacing[24],
    })
  })

  it("applies an explicit width and height", () => {
    expect(renderSkeleton({ height: spacing[12], width: "60%" })).toHaveStyle({ height: spacing[12], width: "60%" })
  })

  it("forwards className and style to the root element", () => {
    const element = renderSkeleton({ className: "custom", style: { margin: "4px" } })

    expect(element).toHaveClass("custom")
    expect(element).toHaveStyle({ margin: "4px" })
  })
})
