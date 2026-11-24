import { expect, test } from "./support/test.ts"

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
