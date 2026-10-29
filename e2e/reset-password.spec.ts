import { expect, type Page, test } from "@playwright/test"

// The backend is mocked at the browser (page.route). The link carries its own tenant, which must be the
// one sent - not the deploy's (schoolflow_demo) - so the tests use a different one.
const validateEndpoint = "**/api/auth/password-recovery/validate"
const confirmEndpoint = "**/api/auth/password-recovery/confirm"
const linkTenant = "outra_escola"
const resetUrl = `/reset-password?token=token-do-link&tenant=${linkTenant}`

type Captured = { body: unknown; tenant?: string }[]

const mockValidate = async (page: Page, isValid: boolean) => {
  const requests: Captured = []
  await page.route(validateEndpoint, (route) => {
    requests.push({ body: route.request().postDataJSON(), tenant: route.request().headers()["x-tenant-id"] })
    return route.fulfill({ body: JSON.stringify(isValid), contentType: "application/json" })
  })
  return requests
}

const mockConfirm = async (page: Page, status: number, message: string) => {
  const requests: Captured = []
  await page.route(confirmEndpoint, (route) => {
    requests.push({ body: route.request().postDataJSON(), tenant: route.request().headers()["x-tenant-id"] })
    return route.fulfill({
      body: JSON.stringify({ data: null, message, status: status < 400 ? "Success" : "Error", tenantId: linkTenant }),
      contentType: "application/json",
      status,
    })
  })
  return requests
}

const newPasswordField = (page: Page) => page.getByLabel(/^Nova senha/)
const confirmPasswordField = (page: Page) => page.getByLabel(/^Confirmar nova senha/)
const submitButton = (page: Page) => page.getByRole("button", { name: "Salvar nova senha" })
const invalidLinkTitle = "Este link não é mais válido"

test("checks the link's token against the link's tenant before showing the form", async ({ page }) => {
  const requests = await mockValidate(page, true)
  await page.goto(resetUrl)

  await expect(page.getByRole("heading", { level: 1, name: "Criar nova senha" })).toBeVisible()
  await expect(newPasswordField(page)).toHaveAttribute("autocomplete", "new-password")

  // The dev server's StrictMode may run the check twice; every call must carry the link's token and tenant.
  expect(requests.length).toBeGreaterThan(0)
  for (const request of requests) expect(request).toEqual({ body: { token: "token-do-link" }, tenant: linkTenant })
})

test("says the link is no longer valid when the token was used or expired", async ({ page }) => {
  await mockValidate(page, false)
  await page.goto(resetUrl)

  await expect(page.getByText(invalidLinkTitle)).toBeVisible()
  await expect(newPasswordField(page)).toHaveCount(0)

  await page.getByRole("link", { name: "Pedir um novo link" }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
})

test("says the link is no longer valid when it has no token, without calling the backend", async ({ page }) => {
  const requests = await mockValidate(page, true)
  await page.goto("/reset-password")

  await expect(page.getByText(invalidLinkTitle)).toBeVisible()
  expect(requests).toHaveLength(0)
})

test("offers a retry when the token can't be checked", async ({ page }) => {
  let isBackendUp = false
  await page.route(validateEndpoint, (route) =>
    isBackendUp ? route.fulfill({ body: "true", contentType: "application/json" }) : route.abort("connectionrefused"),
  )
  await page.goto(resetUrl)

  await expect(page.getByText("Não foi possível verificar o link")).toBeVisible()
  isBackendUp = true
  await page.getByRole("button", { name: "Tentar novamente" }).click()

  await expect(newPasswordField(page)).toBeVisible()
})

test("enforces the password policy and the confirmation before calling the backend", async ({ page }) => {
  await mockValidate(page, true)
  const requests = await mockConfirm(page, 200, "Password updated.")
  await page.goto(resetUrl)

  await submitButton(page).click()
  await expect(page.getByText("Informe a nova senha.")).toBeVisible()
  await expect(page.getByText("Confirme a nova senha.")).toBeVisible()

  await newPasswordField(page).fill("curta")
  await submitButton(page).click()
  await expect(page.getByText("Use pelo menos 12 caracteres.")).toBeVisible()

  await newPasswordField(page).fill("a".repeat(129))
  await submitButton(page).click()
  await expect(page.getByText("Use no máximo 128 caracteres.")).toBeVisible()

  await newPasswordField(page).fill("nova-senha-segura")
  await confirmPasswordField(page).fill("outra-senha-segura")
  await submitButton(page).click()
  await expect(page.getByText("As senhas não coincidem.")).toBeVisible()

  expect(requests).toHaveLength(0)
})

test("saves the new password and sends the user to the login", async ({ page }) => {
  await mockValidate(page, true)
  const requests = await mockConfirm(page, 200, "Password updated.")
  await page.goto(resetUrl)

  await newPasswordField(page).fill("nova-senha-segura")
  await confirmPasswordField(page).fill("nova-senha-segura")
  await submitButton(page).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Senha alterada. Entre com a nova senha.")).toBeVisible()
  expect(requests).toEqual([{ body: { newPassword: "nova-senha-segura", token: "token-do-link" }, tenant: linkTenant }])
})

test("says the link is no longer valid when the token dies while the form is open", async ({ page }) => {
  await mockValidate(page, true)
  await mockConfirm(page, 400, "Recovery token is invalid or expired.")
  await page.goto(resetUrl)

  await newPasswordField(page).fill("nova-senha-segura")
  await confirmPasswordField(page).fill("nova-senha-segura")
  await submitButton(page).click()

  await expect(page.getByText(invalidLinkTitle)).toBeVisible()
})

test("tells the user to try again when the new password can't be saved", async ({ page }) => {
  await mockValidate(page, true)
  await page.route(confirmEndpoint, (route) => route.abort("connectionrefused"))
  await page.goto(resetUrl)

  await newPasswordField(page).fill("nova-senha-segura")
  await confirmPasswordField(page).fill("nova-senha-segura")
  await submitButton(page).click()

  await expect(page.getByRole("alert")).toHaveText("Não foi possível salvar agora. Tente novamente em instantes.")
  await expect(page).toHaveURL(/\/reset-password/)
})
