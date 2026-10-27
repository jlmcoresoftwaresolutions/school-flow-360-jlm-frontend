import { expect, type Page, test } from "@playwright/test"

// The backend is mocked at the browser (page.route); it answers every address the same way.
const recoveryEndpoint = "**/api/auth/password-recovery/request"
const sentMessage =
  "Se houver uma conta com este e-mail, você receberá um link para redefinir sua senha. Confira também a caixa de spam."

const acceptedBody = {
  data: null,
  message: "If the account is eligible, recovery instructions will be sent.",
  status: "Success",
  tenantId: "schoolflow_demo",
}

const mockRecovery = async (page: Page) => {
  const requests: { body: unknown; tenant?: string }[] = []
  await page.route(recoveryEndpoint, (route) => {
    requests.push({ body: route.request().postDataJSON(), tenant: route.request().headers()["x-tenant-id"] })
    return route.fulfill({ body: JSON.stringify(acceptedBody), contentType: "application/json", status: 202 })
  })
  return requests
}

const emailField = (page: Page) => page.getByRole("textbox", { name: "E-mail" })

test("is reached from the login's forgot-password link", async ({ page }) => {
  await page.goto("/login")

  await page.getByRole("link", { name: "Esqueci minha senha" }).click()

  await expect(page).toHaveURL(/\/recuperar-senha$/)
  await expect(page.getByRole("heading", { level: 1, name: "Recuperar acesso" })).toBeVisible()
  await expect(page.getByText(/Se ele estiver cadastrado, enviaremos um link/)).toBeVisible()
})

test("leads back to the login", async ({ page }) => {
  await page.goto("/recuperar-senha")

  await page.getByRole("link", { name: "Voltar para o login" }).click()

  await expect(page).toHaveURL(/\/login$/)
})

test("points out a missing or malformed e-mail instead of calling the backend", async ({ page }) => {
  const requests = await mockRecovery(page)
  await page.goto("/recuperar-senha")

  await page.getByRole("button", { name: "Enviar link" }).click()
  await expect(page.getByText("Informe seu e-mail.")).toBeVisible()

  await emailField(page).fill("diretor@escola")
  await page.getByRole("button", { name: "Enviar link" }).click()
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible()

  expect(requests).toHaveLength(0)
})

test("sends the e-mail and the tenant, then confirms without saying whether the account exists", async ({ page }) => {
  const requests = await mockRecovery(page)
  await page.goto("/recuperar-senha")

  await emailField(page).fill("diretor@schoolflow360.com.br")
  await page.getByRole("button", { name: "Enviar link" }).click()

  await expect(page.getByText(sentMessage)).toBeVisible()
  expect(requests).toEqual([{ body: { email: "diretor@schoolflow360.com.br" }, tenant: "schoolflow_demo" }])
})

test("locks the button for a while after sending, so a second click doesn't send again", async ({ page }) => {
  const requests = await mockRecovery(page)
  await page.goto("/recuperar-senha")

  await emailField(page).fill("diretor@schoolflow360.com.br")
  await page.getByRole("button", { name: "Enviar link" }).click()

  const button = page.getByRole("button", { name: /^Reenviar em \d+s$/ })
  await expect(button).toBeDisabled()
  await button.click({ force: true })

  expect(requests).toHaveLength(1)
})

test("answers the same way for any address", async ({ page }) => {
  await mockRecovery(page)

  for (const email of ["existe@schoolflow360.com.br", "nao-existe@schoolflow360.com.br"]) {
    await page.goto("/recuperar-senha")
    await emailField(page).fill(email)
    await page.getByRole("button", { name: "Enviar link" }).click()

    await expect(page.getByText(sentMessage)).toBeVisible()
  }
})

test("tells the user to try again when the backend can't be reached, and doesn't confirm", async ({ page }) => {
  await page.route(recoveryEndpoint, (route) => route.abort("connectionrefused"))
  await page.goto("/recuperar-senha")

  await emailField(page).fill("diretor@schoolflow360.com.br")
  await page.getByRole("button", { name: "Enviar link" }).click()

  await expect(page.getByText("Não foi possível enviar agora. Tente novamente em instantes.")).toBeVisible()
  await expect(page.getByText(sentMessage)).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Enviar link" })).toBeEnabled()
})

test("sends a signed-in user home", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: {
          accessToken: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          refreshToken: "refresh-token",
          token: "access-token",
        },
        message: "Authentication successful.",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )
  await page.goto("/login")
  await emailField(page).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/administracao\/minha-escola$/)

  await page.goto("/recuperar-senha")

  await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
})
