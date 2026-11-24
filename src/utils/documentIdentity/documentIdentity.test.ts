import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { defaultDocumentTitle, setDocumentIdentity } from "./documentIdentity"

const favicon = () => document.querySelector("link[rel~='icon']") as HTMLLinkElement

describe("setDocumentIdentity", () => {
  beforeEach(() => {
    const link = document.createElement("link")
    link.setAttribute("rel", "icon")
    link.setAttribute("type", "image/svg+xml")
    link.setAttribute("href", "/school-flow-icon.svg")
    document.head.appendChild(link)
  })

  afterEach(() => {
    setDocumentIdentity({ faviconUrl: null, title: null })
    favicon().remove()
  })

  it("shows the school's title and favicon", () => {
    setDocumentIdentity({ faviconUrl: "https://files.test/favicon.png", title: "Alunos · Colégio Horizonte" })

    expect(document.title).toBe("Alunos · Colégio Horizonte")
    expect(favicon()).toHaveAttribute("href", "https://files.test/favicon.png")
    expect(favicon()).not.toHaveAttribute("type")
  })

  it("restores the product's title and favicon", () => {
    setDocumentIdentity({ faviconUrl: "https://files.test/favicon.png", title: "Alunos · Colégio Horizonte" })
    setDocumentIdentity({ faviconUrl: null, title: null })

    expect(document.title).toBe(defaultDocumentTitle)
    expect(favicon()).toHaveAttribute("href", "/school-flow-icon.svg")
    expect(favicon()).toHaveAttribute("type", "image/svg+xml")
  })
})
