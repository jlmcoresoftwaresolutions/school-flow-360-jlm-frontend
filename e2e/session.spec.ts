import { apiAnswer, expect, type Page, signedInUser, test } from "./support/test.ts"

// The backend is mocked at the browser (page.route). Each login answer gets its expiry from the moment
// it is sent, so a test can hand out a session that ends a few seconds later.
const mockLogin = async (page: Page, sessionLengthsMs: number[]) => {
  const lengths = [...sessionLengthsMs]
  // Minha Organização reads the visual identity from the backend; nothing saved yet is enough here.
  await page.route("**/api/organizations/current/branding", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: { configured: false, hasLogo: false, hasUnpublishedChanges: false, published: false, version: null },
        message: "",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )
  // Minha Organização reads the organization from the backend.
  await page.route("**/api/organizations/current/editable", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: {
          orgAddressCep: "60150-161",
          orgAddressComplement: "",
          orgAddressCountry: "Brasil",
          orgAddressDistrict: "Aldeota",
          orgAddressCity: "Fortaleza",
          orgAddressNumber: "1500",
          orgAddressState: "CE",
          orgAddressStreet: "Avenida Santos Dumont",
          orgEmail: "contato@horizonte.edu.br",
          orgId: 1,
          orgInstName: "Associação Educacional Horizonte",
          orgInstTel: "(85) 3333-1100",
          orgName: "Colégio Horizonte",
          orgNotes: "",
          orgOpType: "PRIVATE",
          orgStatus: "ENABLE",
          version: 0,
        },
        message: "",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )
  // Minha Organização lists the units from the backend; an empty list is enough here.
  await page.route("**/api/school-units?*", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: { content: [], number: 0, size: 100, totalElements: 0, totalPages: 0 },
        message: "",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )
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
  await page.getByRole("textbox", { name: "E-mail ou apelido" }).fill("diretor@schoolflow360.com.br")
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
const myUnitHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Minha Organização" })

test("ends the session when it expires, even on an idle page, and brings the user back after signing in", async ({
  page,
}) => {
  await mockLogin(page, [4000, oneHour])
  await page.goto("/administration/my-unit")
  await signIn(page)
  await expect(myUnitHeading(page)).toBeVisible()

  // Nothing is clicked: the expiry alone ends the session and the page's data leaves the screen.
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadministration%2Fmy-unit&expired=1$/, { timeout: 15_000 })
  await expect(page.getByRole("status").filter({ hasText: expiredNotice })).toBeVisible()
  await expect(myUnitHeading(page)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem("sf360.session"))).toBeNull()

  await signIn(page)

  await expect(page).toHaveURL(/\/administration\/my-unit$/)
  await expect(myUnitHeading(page)).toBeVisible()
})

test("renews the session when its access token expires, keeping the user on the page", async ({ page }) => {
  await mockLogin(page, [4000])
  const refreshBodies: unknown[] = []
  await page.route("**/api/auth/refresh", (route) => {
    refreshBodies.push(route.request().postDataJSON())
    return route.fulfill(
      apiAnswer({
        expiresAt: new Date(Date.now() + oneHour).toISOString(),
        refreshToken: "refresh-token-2",
        token: "access-token-2",
      }),
    )
  })
  const meAuthorizations: (string | undefined)[] = []
  await page.route("**/api/me", (route) => {
    meAuthorizations.push(route.request().headers().authorization)
    return route.fulfill(apiAnswer(signedInUser))
  })

  await page.goto("/administration/my-unit")
  await signIn(page)
  await expect(myUnitHeading(page)).toBeVisible()

  // The expiry passes on an idle page: the session is renewed instead of ending.
  await expect.poll(() => refreshBodies, { timeout: 15_000 }).toEqual([{ refreshToken: "refresh-token" }])
  await expect(page).toHaveURL(/\/administration\/my-unit$/)

  // A new visit goes on with the renewed token.
  await page.reload()
  await expect(myUnitHeading(page)).toBeVisible()
  await expect.poll(() => meAuthorizations.at(-1)).toBe("Bearer access-token-2")
})

test("shows who signed in, and keeps a role away from the pages it doesn't open", async ({ page }) => {
  const teacher = { ...signedInUser, admin: false, fullName: "Maria Souza", roles: ["PROFESSOR"] }
  await mockLogin(page, [oneHour])
  await page.route("**/api/me", (route) => route.fulfill(apiAnswer(teacher)))

  await page.goto("/login")
  await signIn(page)
  await expect(page).toHaveURL(/\/home$/)

  const banner = page.getByRole("banner")
  await expect(banner.getByText("Maria Souza")).toBeVisible()
  await expect(banner.getByText("Professor", { exact: true })).toBeVisible()

  const sidebar = page.getByRole("complementary")
  await expect(sidebar.getByRole("button", { name: "Administração" })).toHaveCount(0)
  await expect(sidebar.getByRole("button", { name: "Usuários" })).toHaveCount(0)

  // Typing the address of a page the role doesn't open lands on a page that says so, telling nothing
  // about the page asked for, with a way back home.
  await page.goto("/administration/my-unit")
  await expect(page).toHaveURL(/\/access-denied$/)
  await expect(myUnitHeading(page)).toHaveCount(0)
  await expect(page.getByText("Você não tem acesso a esta página")).toBeVisible()
  await page.getByRole("link", { name: "Ir para o início" }).click()
  await expect(page).toHaveURL(/\/home$/)
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
