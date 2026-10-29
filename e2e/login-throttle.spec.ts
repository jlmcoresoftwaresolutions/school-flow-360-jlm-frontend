import { expect, type Page, test } from "@playwright/test"

// The backend is mocked to reject every password, and the browser clock is simulated (page.clock) so
// the lock's minutes pass instantly.
const mockRejectedLogin = async (page: Page) => {
  const requests: string[] = []
  await page.route("**/api/auth/login", (route) => {
    requests.push(route.request().postDataJSON().email)
    return route.fulfill({
      body: JSON.stringify({
        data: null,
        message: "Invalid credentials.",
        status: "Error",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
      status: 401,
    })
  })
  return requests
}

const tryPassword = async (page: Page, email: string) => {
  await page.getByRole("textbox", { name: "E-mail" }).fill(email)
  await page.getByLabel(/^Senha/).fill("senha-errada")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("alert")).toBeVisible()
}

const failTimes = async (page: Page, email: string, times: number) => {
  for (let attempt = 0; attempt < times; attempt += 1) await tryPassword(page, email)
}

const email = "diretor@schoolflow360.com.br"

test.beforeEach(async ({ page }) => {
  await page.clock.install()
})

test("locks sign-in for 1 minute on the 5th wrong password, then 3 minutes on the 10th", async ({ page }) => {
  const requests = await mockRejectedLogin(page)
  await page.goto("/login")

  await failTimes(page, email, 4)
  await expect(page.getByRole("alert")).toHaveText("Credenciais incorretas")

  await tryPassword(page, email)
  await expect(page.getByRole("alert")).toHaveText(
    "Muitas tentativas incorretas. Aguarde 1 minuto para tentar de novo.",
  )
  const lockedButton = page.getByRole("button", { name: /^Tentar em \d:\d\d$/ })
  await expect(lockedButton).toBeDisabled()
  await expect(lockedButton).toHaveText("Tentar em 1:00")

  await lockedButton.click({ force: true })
  expect(requests).toHaveLength(5)

  await page.clock.fastForward("00:30")
  await expect(lockedButton).toHaveText("Tentar em 0:30")

  await page.clock.fastForward("00:30")
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled()

  await failTimes(page, email, 5)
  await expect(page.getByRole("alert")).toHaveText(
    "Muitas tentativas incorretas. Aguarde 3 minutos para tentar de novo.",
  )
  await expect(lockedButton).toHaveText("Tentar em 3:00")
  expect(requests).toHaveLength(10)
})

test("keeps the lock after a reload, without calling the backend", async ({ page }) => {
  const requests = await mockRejectedLogin(page)
  await page.goto("/login")
  await failTimes(page, email, 5)

  await page.reload()
  await tryPassword(page, email)

  await expect(page.getByRole("alert")).toHaveText(
    "Muitas tentativas incorretas. Aguarde 1 minuto para tentar de novo.",
  )
  await expect(page.getByRole("button", { name: /^Tentar em / })).toBeDisabled()
  expect(requests).toHaveLength(5)
})

test("only holds back the locked e-mail", async ({ page }) => {
  const requests = await mockRejectedLogin(page)
  await page.goto("/login")
  await failTimes(page, email, 5)

  await page.getByRole("textbox", { name: "E-mail" }).fill("secretaria@schoolflow360.com.br")

  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled()
  await tryPassword(page, "secretaria@schoolflow360.com.br")
  await expect(page.getByRole("alert")).toHaveText("Credenciais incorretas")
  expect(requests).toHaveLength(6)
})
