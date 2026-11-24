import { apiAnswer, expect, type Page, test } from "./support/test.ts"

// The school an address serves (src/utils/tenant). The suite runs on localhost, which isn't a school's
// address, so it serves the fixed development school (VITE_TENANT_ID in .env.development); the address
// rules themselves are covered by tenant.test.ts.

test("sends the development school on every call to the backend", async ({ page }) => {
  const tenants: (string | undefined)[] = []
  await page.route("**/api/auth/login", (route) => {
    tenants.push(route.request().headers()["x-tenant-id"])
    return route.fulfill({ body: JSON.stringify({ message: "Invalid credentials." }), status: 401 })
  })

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail ou apelido" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-errada")
  await page.getByRole("button", { name: "Entrar" }).click()

  await expect.poll(() => tenants).toEqual(["schoolflow_demo"])
})

test("leaves the page for an address without a school when the address serves one", async ({ page }) => {
  await page.goto("/unknown-school")

  await expect(page).toHaveURL(/\/login$/)
})

// A 1x1 PNG, standing in for the logo's temporary link.
const logoUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const publishBranding = (page: Page) =>
  page.route("**/api/public/branding", (route) =>
    route.fulfill(
      apiAnswer({
        displayName: "Colégio Saber",
        favicon: null,
        logo: { expiresAt: "2099-01-01T00:00:00Z", url: logoUrl },
        primaryColor: "#1E40AF",
        secondaryColor: null,
      }),
    ),
  )

const refuseUnknownSchool = (page: Page) =>
  page.route("**/api/public/branding", (route) =>
    route.fulfill({
      body: JSON.stringify({ code: "TENANT_NOT_FOUND", data: null, message: "School not found.", status: "Error" }),
      contentType: "application/json",
      status: 404,
    }),
  )

test("shows the school's published name and logo on the login and the password recovery", async ({ page }) => {
  await publishBranding(page)

  await page.goto("/login")
  await expect(page.getByText("Colégio Saber")).toBeVisible()
  await expect(page.locator('img[src^="data:image/png"]')).toBeVisible()

  await page.getByRole("link", { name: "Esqueci minha senha" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByText("Colégio Saber")).toBeVisible()
})

test("keeps the default login when the school has published nothing", async ({ page }) => {
  await page.goto("/login")

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByText("Colégio Saber")).toHaveCount(0)
})

test("says the school wasn't found when the backend doesn't know the address's school", async ({ page }) => {
  await refuseUnknownSchool(page)

  await page.goto("/login")

  await expect(page).toHaveURL(/\/school-not-found$/)
  await expect(page.getByText("Escola não encontrada")).toBeVisible()
  await expect(page.getByText("localhost:5174")).toBeVisible()

  await publishBranding(page)
  await page.getByRole("link", { name: "Tentar de novo" }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Colégio Saber")).toBeVisible()
})
