import { apiAnswer, expect, type Page, test } from "./support/test.ts"
import { signInAndOpen } from "./support/userAccess.ts"

// The school's published identity in the shell behind the login and in the browser tab: its favicon
// (or logo) and name in the menu, with the product's discreet "Powered by", and "<page> · <school>"
// with its favicon in the tab. Without a published identity, the product's own look stays.

// A 1x1 PNG, standing in for the temporary links of the favicon and the logo.
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const identity = {
  displayName: "Colégio Horizonte",
  favicon: { expiresAt: "2099-01-01T00:00:00Z", url: `${png}#favicon` },
  logo: { expiresAt: "2099-01-01T00:00:00Z", url: `${png}#logo` },
  primaryColor: "#1E40AF",
  publishedAt: "2026-11-24T12:00:00Z",
  secondaryColor: null,
}

const publish = (page: Page) =>
  page.route("**/api/organizations/current/branding/published", (route) => route.fulfill(apiAnswer(identity)))

const menu = (page: Page) => page.getByRole("complementary")

test("shows the school's name, icon and tab behind the login", async ({ page }) => {
  await publish(page)
  await signInAndOpen(page, "/home")

  await expect(menu(page)).toContainText("Colégio Horizonte")
  await expect(menu(page)).toContainText("Powered by SchoolFlow360º")
  await expect(menu(page).getByRole("img", { name: "Ícone de Colégio Horizonte" })).toHaveAttribute(
    "src",
    `${png}#favicon`,
  )
  await expect(page).toHaveTitle("Início · Colégio Horizonte")
  await expect(page.locator("link[rel~='icon']")).toHaveAttribute("href", `${png}#favicon`)
})

test("keeps the product's look when nothing was published", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(menu(page)).toContainText("SchoolFlow360º")
  await expect(menu(page)).not.toContainText("Powered by")
  await expect(page).toHaveTitle("SchoolFlow360º | JLM Core")
})

test("names the school in the tab of the login", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  await expect(page).toHaveTitle("Entrar · Colégio Horizonte")
  await expect(page.locator("link[rel~='icon']")).toHaveAttribute("href", `${png}#favicon`)
})
