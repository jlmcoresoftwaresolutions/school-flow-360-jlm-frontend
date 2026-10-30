import { expect, type Page, test } from "@playwright/test"

// The backend is mocked at the browser (page.route). Each login answer gets its expiry from the moment
// it is sent, so a test can hand out a session that ends a few seconds later.
const mockLogin = async (page: Page, sessionLengthsMs: number[]) => {
  const lengths = [...sessionLengthsMs]
  await page.route("**/api/auth/login", (route) => {
    const lengthMs = lengths.length > 1 ? lengths.shift()! : lengths[0]
    return route.fulfill({
      body: JSON.stringify({
        data: {
          accessToken: null,
          expiresAt: new Date(Date.now() + lengthMs).toISOString(),
          refreshToken: "refresh-token",
          token: "access-token",
        },
        message: "Login successful.",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    })
  })
}

const signIn = async (page: Page) => {
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
}

// Signing out is in the menu the user block (in the topbar) opens.
const signOut = async (page: Page) => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: /^João Silva/ })
    .click()
  await page.getByRole("menuitem", { name: "Sair" }).click()
}

const oneHour = 60 * 60 * 1000
const expiredNotice = "Sua sessão expirou. Entre novamente para continuar."
const minhaUnidadeHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Minha Unidade" })

test("ends the session when it expires, even on an idle page, and brings the user back after signing in", async ({
  page,
}) => {
  await mockLogin(page, [4000, oneHour])
  await page.goto("/administration/my-unit")
  await signIn(page)
  await expect(minhaUnidadeHeading(page)).toBeVisible()

  // Nothing is clicked: the expiry alone ends the session and the page's data leaves the screen.
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadministration%2Fmy-unit&expired=1$/, { timeout: 15_000 })
  await expect(page.getByRole("status").filter({ hasText: expiredNotice })).toBeVisible()
  await expect(minhaUnidadeHeading(page)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem("sf360.session"))).toBeNull()

  await signIn(page)

  await expect(page).toHaveURL(/\/administration\/my-unit$/)
  await expect(minhaUnidadeHeading(page)).toBeVisible()
})

test("brings a visitor back to the page they opened, without saying a session expired", async ({ page }) => {
  await mockLogin(page, [oneHour])
  await page.goto("/administration/my-unit")

  await expect(page).toHaveURL(/\/login\?redirect=%2Fadministration%2Fmy-unit$/)
  await expect(page.getByText(expiredNotice)).toHaveCount(0)

  await signIn(page)

  await expect(page).toHaveURL(/\/administration\/my-unit$/)
})

test("signs out from the header, ending the session here and on the backend", async ({ page }) => {
  await mockLogin(page, [oneHour])
  const logoutRequests: (string | undefined)[] = []
  await page.route("**/api/auth/logout", (route) => {
    logoutRequests.push(route.request().headers().authorization)
    return route.fulfill({
      body: JSON.stringify({ data: null, message: "Logged out.", status: "Success", tenantId: "schoolflow_demo" }),
      contentType: "application/json",
    })
  })
  await page.goto("/login")
  await signIn(page)
  await expect(page).toHaveURL(/\/home$/)

  await signOut(page)

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(expiredNotice)).toHaveCount(0)
  await expect.poll(() => logoutRequests).toEqual(["Bearer access-token"])
  expect(await page.evaluate(() => localStorage.getItem("sf360.session"))).toBeNull()

  // The inner pages are closed again.
  await page.goto("/administration/my-unit")
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadministration%2Fmy-unit$/)
})

test("signs out at once even when the backend doesn't answer", async ({ page }) => {
  await mockLogin(page, [oneHour])
  await page.route("**/api/auth/logout", () => undefined)
  await page.goto("/login")
  await signIn(page)
  await expect(page).toHaveURL(/\/home$/)

  await signOut(page)

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("status", { name: "Carregando..." })).toHaveCount(0)
})

test("ignores a return address outside the app", async ({ page }) => {
  await mockLogin(page, [oneHour])

  for (const redirect of ["//example.com", "https://example.com", "/\\example.com"]) {
    await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
    await signIn(page)

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/home$/)
    await page.evaluate(() => localStorage.clear())
  }
})
