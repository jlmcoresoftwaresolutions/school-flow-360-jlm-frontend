import { expect, type Page, test } from "@playwright/test"

// Signs in (backend mocked) and opens the edit form of Minha Unidade's organization details.
const openDetailsForm = async (page: Page) => {
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
  await page.route("**/api/auth/logout", (route) => route.fulfill({ body: "{}", contentType: "application/json" }))

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
  await page.getByRole("complementary").getByRole("button", { name: "Minha Unidade" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Minha Unidade" })).toBeVisible()

  await page.getByRole("button", { name: "Editar" }).first().click()
}

const displayNameField = (page: Page) => page.getByRole("textbox", { name: "Nome exibido" })
// Signing out is in the menu the user block (in the topbar) opens.
const signOut = async (page: Page) => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: /^João Silva/ })
    .click()
  await page.getByRole("menuitem", { name: "Sair" }).click()
}
const warning = (page: Page) => page.getByRole("dialog", { name: "Descartar alterações?" })

test("warns in a centered dialog before leaving a form with unsaved changes, and keeps them", async ({ page }) => {
  await openDetailsForm(page)
  await displayNameField(page).fill("Colégio Horizonte Novo")

  await signOut(page)

  await expect(warning(page)).toBeVisible()
  await expect(warning(page)).toContainText("Se sair agora, elas serão perdidas.")

  const box = await warning(page).boundingBox()
  const viewport = page.viewportSize()
  expect(box && viewport && Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2)

  await warning(page).getByRole("button", { name: "Continuar editando" }).click()

  await expect(warning(page)).toBeHidden()
  await expect(page).toHaveURL(/\/administration\/my-unit$/)
  await expect(displayNameField(page)).toHaveValue("Colégio Horizonte Novo")
})

test("leaves, dropping the changes, when the user confirms", async ({ page }) => {
  await openDetailsForm(page)
  await displayNameField(page).fill("Colégio Horizonte Novo")

  await signOut(page)
  await warning(page).getByRole("button", { name: "Sair sem salvar" }).click()

  await expect(page).toHaveURL(/\/login$/)
})

test("doesn't warn when the form was opened but nothing changed", async ({ page }) => {
  await openDetailsForm(page)

  await signOut(page)

  await expect(page).toHaveURL(/\/login$/)
  await expect(warning(page)).toHaveCount(0)
})
