import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { borderRadiusLevels, shadows, spacing } from "@/foundation"

import { Image } from "./Image"

describe("Image", () => {
  it("renders an img element with the src and alt props", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" />)

    const image = screen.getByRole("img", { name: "Foto de perfil" })

    expect(image).toHaveAttribute("src", "/avatar.png")
  })

  it("defaults to a 48px size", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({
      height: spacing[48],
      width: spacing[48],
    })
  })

  it("applies the size prop", () => {
    render(<Image alt="Foto de perfil" size={96} src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({
      height: spacing[96],
      width: spacing[96],
    })
  })

  it("defaults to the xl box shadow", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).not.toHaveStyle({ boxShadow: "none" })
  })

  it("applies the boxShadow prop", () => {
    render(<Image alt="Foto de perfil" boxShadow="none" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ boxShadow: shadows.none })
  })

  it("defaults to the medium border radius", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ borderRadius: borderRadiusLevels.medium })
  })

  it("applies the borderRadius prop", () => {
    render(<Image alt="Foto de perfil" borderRadius="high" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("applies the full borderRadius level", () => {
    render(<Image alt="Foto de perfil" borderRadius="full" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ borderRadius: borderRadiusLevels.full })
  })

  it("does not stretch to fill a flex container by default", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ alignSelf: "flex-start" })
  })

  it("applies the className passed as a prop", () => {
    render(<Image alt="Foto de perfil" className="custom" src="/avatar.png" />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Image alt="Foto de perfil" src="/avatar.png" style={{ marginTop: "8px" }} />)

    expect(screen.getByRole("img", { name: "Foto de perfil" })).toHaveStyle({ marginTop: "8px" })
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Image tooltip"

    render(<Image alt="Foto de perfil" src="/avatar.png" tooltip={tooltipText} />)

    const image = screen.getByRole("img", { name: "Foto de perfil" })

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(image)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(image)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
