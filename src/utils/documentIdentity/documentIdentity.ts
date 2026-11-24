// The browser tab's title and icon. index.html sets the product's own (SchoolFlow360º); a school
// with a published identity gets its name and favicon instead, and going back to null restores the
// product's.

export const defaultDocumentTitle = "SchoolFlow360º | JLM Core"

const faviconSelector = "link[rel~='icon']"

// The product's favicon, as index.html (or the build) set it, read once so it can be restored.
let defaultFaviconHref: string | null = null

const faviconLink = (): HTMLLinkElement | null => document.querySelector<HTMLLinkElement>(faviconSelector)

export type DocumentIdentity = {
  // The school's favicon, or null for the product's.
  faviconUrl: string | null
  // The tab's title, or null for the product's.
  title: string | null
}

export const setDocumentIdentity = (identity: DocumentIdentity): void => {
  document.title = identity.title ?? defaultDocumentTitle

  const link = faviconLink()
  if (!link) return
  defaultFaviconHref ??= link.getAttribute("href")
  const href = identity.faviconUrl ?? defaultFaviconHref
  if (href) link.setAttribute("href", href)
  // The school's favicon is a PNG or a JPEG, not the product's SVG.
  if (identity.faviconUrl) link.removeAttribute("type")
  else link.setAttribute("type", "image/svg+xml")
}
