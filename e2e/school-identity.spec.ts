import { apiAnswer, expect, type Page, test } from "./support/test.ts"
import { signInAndOpen } from "./support/userAccess.ts"

// The school's published identity in the shell behind the login and in the browser tab: its favicon
// (or logo) and name in the menu, with the product's discreet "Powered by", "<page> · <school>" with
// its favicon in the tab, and its primary color on buttons, links and tabs. Without a published
// identity, the product's own look stays.

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

// A step of the primary scale as the page sets it, empty when it follows the product's palette.
const primaryStep = (page: Page, step: number) =>
  page.locator("html").evaluate((root, name) => root.style.getPropertyValue(name), `--sf-primary-${step}`)

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
  await expect.poll(() => primaryStep(page, 700)).toBe("#1E40AF")
})

test("keeps the product's look when nothing was published", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(menu(page)).toContainText("SchoolFlow360º")
  await expect(menu(page)).not.toContainText("Powered by")
  await expect(page).toHaveTitle("SchoolFlow360º | JLM Core")
  expect(await primaryStep(page, 600)).toBe("")
})

test("names the school in the tab of the login", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  await expect(page).toHaveTitle("Entrar · Colégio Horizonte")
  await expect(page.locator("link[rel~='icon']")).toHaveAttribute("href", `${png}#favicon`)
})

test("paints the login with the school's color", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  // #2D56DB, the step of the scale under white text for #1E40AF.
  await expect(page.getByRole("button", { name: "Entrar" })).toHaveCSS("background-color", "rgb(45, 86, 219)")
})

test("keeps the product's color on the login when nothing was published", async ({ page }) => {
  await page.goto("/login")

  // #4574B0, the product's own.
  await expect(page.getByRole("button", { name: "Entrar" })).toHaveCSS("background-color", "rgb(69, 116, 176)")
})
