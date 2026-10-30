import { expect, type Page, test } from "@playwright/test"

// Signs in with the backend mocked, landing on Início.
const signIn = async (page: Page) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: {
          accessToken: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          refreshToken: "refresh-token",
          token: "access-token",
        },
        message: "Login successful.",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)
}

const sidebar = (page: Page) => page.getByRole("complementary")
const breadcrumb = (page: Page) => page.getByRole("navigation", { name: "Você está em" })

test("opens a menu page from its group, with the breadcrumb showing where it is", async ({ page }) => {
  await signIn(page)

  await sidebar(page).getByRole("button", { name: "Acadêmico" }).click()
  await sidebar(page).getByRole("button", { name: "Turmas" }).click()

  await expect(page).toHaveURL(/\/academic\/classes$/)
  await expect(page.getByRole("heading", { level: 1, name: "Turmas" })).toBeVisible()
  await expect(breadcrumb(page)).toContainText("Acadêmico")
  await expect(breadcrumb(page).getByText("Turmas")).toHaveAttribute("aria-current", "page")
  await expect(sidebar(page).getByRole("button", { name: "Turmas" })).toHaveAttribute("aria-current", "page")
})

test("lands on Início after signing in, and comes back to it from the menu", async ({ page }) => {
  await signIn(page)

  await expect(sidebar(page).getByRole("button", { name: "Início" })).toHaveAttribute("aria-current", "page")
  await expect(breadcrumb(page).getByText("Início")).toHaveAttribute("aria-current", "page")

  await sidebar(page).getByRole("button", { name: "Acadêmico" }).click()
  await sidebar(page).getByRole("button", { name: "Turmas" }).click()
  await sidebar(page).getByRole("button", { name: "Início" }).click()

  await expect(page).toHaveURL(/\/home$/)
})

test("opens a menu page straight from its address", async ({ page }) => {
  await signIn(page)

  await page.goto("/help/contact-support")

  await expect(breadcrumb(page)).toContainText("Ajuda")
  await expect(breadcrumb(page).getByText("Contato com o suporte")).toHaveAttribute("aria-current", "page")
})
