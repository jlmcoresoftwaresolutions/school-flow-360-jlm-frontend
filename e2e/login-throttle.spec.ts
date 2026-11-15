import { expect, type Page, test } from "./support/test.ts"

// The backend holds an e-mail back after repeated wrong passwords and says so with a 429 (and how long
// in Retry-After). It is mocked here: the 3rd wrong password locks, as the backend's first lock does.
// The browser clock is simulated (page.clock) so the wait passes instantly.
const mockBackendLock = async (page: Page, options: { retryAfter?: string } = {}) => {
  const requests: string[] = []
  await page.route("**/api/auth/login", (route) => {
    requests.push(route.request().postDataJSON().email)
    const isLocked = requests.length >= 3

    return route.fulfill({
      body: JSON.stringify({ data: null, message: "Refused.", status: "Error", tenantId: "schoolflow_demo" }),
      contentType: "application/json",
      headers: isLocked && options.retryAfter ? { "Retry-After": options.retryAfter } : {},
      status: isLocked ? 429 : 401,
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

test("holds sign-in back for as long as the backend says, counting down on the button", async ({ page }) => {
  const requests = await mockBackendLock(page, { retryAfter: "180" })
  await page.goto("/login")

  await failTimes(page, email, 2)
  await expect(page.getByRole("alert")).toHaveText("Credenciais incorretas")

  await tryPassword(page, email)
  await expect(page.getByRole("alert")).toHaveText(
    "Muitas tentativas incorretas. Aguarde 3 minutos para tentar de novo.",
  )
  const lockedButton = page.getByRole("button", { name: /^Tentar em \d:\d\d$/ })
  await expect(lockedButton).toBeDisabled()
  await expect(lockedButton).toHaveText("Tentar em 3:00")

  await lockedButton.click({ force: true })
  expect(requests).toHaveLength(3)

  await page.clock.fastForward("01:30")
  await expect(lockedButton).toHaveText("Tentar em 1:30")

  await page.clock.fastForward("01:30")
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled()
})

test("waits 1 minute when the backend doesn't say how long", async ({ page }) => {
  await mockBackendLock(page)
  await page.goto("/login")

  await failTimes(page, email, 3)

  await expect(page.getByRole("alert")).toHaveText(
    "Muitas tentativas incorretas. Aguarde 1 minuto para tentar de novo.",
  )
  await expect(page.getByRole("button", { name: "Tentar em 1:00" })).toBeDisabled()
})

test("only holds back the locked e-mail", async ({ page }) => {
  await mockBackendLock(page, { retryAfter: "60" })
  await page.goto("/login")
  await failTimes(page, email, 3)

  await page.getByRole("textbox", { name: "E-mail" }).fill("secretaria@schoolflow360.com.br")

  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled()
})
