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
  secondaryColor: "#2E7D32",
}

const publish = (page: Page) =>
  page.route("**/api/organizations/current/branding/published", (route) => route.fulfill(apiAnswer(identity)))

const menu = (page: Page) => page.getByRole("complementary")

// A color variable as the page sets it on the root, empty when it follows the product's palette.
const rootVariable = (page: Page, name: string) =>
  page.locator("html").evaluate((root, variable) => root.style.getPropertyValue(variable), name)

const primaryStep = (page: Page, step: number) => rootVariable(page, `--sf-primary-${step}`)

const loginButton = (page: Page) => page.getByRole("button", { name: "Entrar" })

// #2D56DB, the step of the scale under white text for #1E40AF, and #4574B0, the product's own.
const schoolButton = "rgb(45, 86, 219)"
const productButton = "rgb(69, 116, 176)"

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
  await expect.poll(() => rootVariable(page, "--sf-accent-500")).toBe("#2E7D32")
  // The pages' light gray takes a touch of the school's primary.
  await expect.poll(() => rootVariable(page, "--sf-page-background")).not.toBe("")
})

test("keeps the product's look when nothing was published", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(menu(page)).toContainText("SchoolFlow360º")
  await expect(menu(page)).not.toContainText("Powered by")
  await expect(page).toHaveTitle("SchoolFlow360º | JLM Core")
  expect(await primaryStep(page, 600)).toBe("")
  expect(await rootVariable(page, "--sf-page-background")).toBe("")
})

test("names the school in the tab of the login", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  await expect(page).toHaveTitle("Entrar · Colégio Horizonte")
  await expect(page.locator("link[rel~='icon']")).toHaveAttribute("href", `${png}#favicon`)
})

test("puts the school first on the login, the product only signing it", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  const panel = page.getByRole("region", { name: "Colégio Horizonte" })
  await expect(panel).toContainText("Colégio Horizonte")
  await expect(panel).toContainText("Bem-vindo(a) ao portal da escola.")
  await expect(panel).toContainText("Powered by SchoolFlow360º")
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible()
  // No sales copy on a school's login.
  await expect(page.getByText("White Label")).toHaveCount(0)
})

test("writes the school's name on the login even under a wide logo that carries one", async ({ page }) => {
  // A 4:1 logo with its own text: the published name may differ from it, so it is written anyway.
  const wideLogo = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text y="60">Colégio Saber</text></svg>',
  )}`
  await page.route("**/api/public/branding", (route) =>
    route.fulfill(
      apiAnswer({
        ...identity,
        displayName: "Rede Colégio Saber de Ensino",
        logo: { expiresAt: "2099-01-01T00:00:00Z", url: wideLogo },
      }),
    ),
  )
  await page.goto("/login")

  await expect(page.getByRole("region", { name: "Rede Colégio Saber de Ensino" })).toContainText(
    "Rede Colégio Saber de Ensino",
  )
})

test("lets the product host the login when nothing was published", async ({ page }) => {
  await page.goto("/login")

  const panel = page.getByRole("region", { name: "SchoolFlow360º" })
  await expect(panel).toContainText("Bem-vindo(a) ao SchoolFlow360º.")
  await expect(panel).not.toContainText("Powered by")
})

test("paints the login with the school's color", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")

  await expect(loginButton(page)).toHaveCSS("background-color", schoolButton)
  // The animated background takes the school's hues too.
  await expect.poll(() => rootVariable(page, "--sf-backdrop-base")).not.toBe("")
  await expect.poll(() => rootVariable(page, "--sf-backdrop-glowAccent")).not.toBe("")
})

test("keeps the product's color on the login when nothing was published", async ({ page }) => {
  await page.goto("/login")

  await expect(loginButton(page)).toHaveCSS("background-color", productButton)
  expect(await rootVariable(page, "--sf-backdrop-base")).toBe("")
})

test("starts the next visit with the school's colors, before the identity is read again", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")
  await expect(loginButton(page)).toHaveCSS("background-color", schoolButton)

  // The identity never arrives this time: the colors kept from the last visit are there anyway.
  await page.route("**/api/public/branding", () => {})
  await page.reload()

  await expect(loginButton(page)).toHaveCSS("background-color", schoolButton)
})

test("forgets the school's colors once it publishes nothing", async ({ page }) => {
  await page.route("**/api/public/branding", (route) => route.fulfill(apiAnswer(identity)))
  await page.goto("/login")
  await expect(loginButton(page)).toHaveCSS("background-color", schoolButton)

  await page.route("**/api/public/branding", (route) =>
    route.fulfill({
      body: JSON.stringify({ code: "BRANDING_NOT_PUBLISHED", data: null, message: "", status: "Error" }),
      contentType: "application/json",
      status: 404,
    }),
  )
  await page.reload()

  await expect(loginButton(page)).toHaveCSS("background-color", productButton)
})
