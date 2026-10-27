import { expect, type Page, test } from "@playwright/test"

// The backend is mocked at the browser (page.route), so these tests don't depend on it being up.
const loginEndpoint = "**/api/auth/login"

const mockLogin = async (page: Page, status: number, body: unknown) => {
  await page.route(loginEndpoint, (route) =>
    route.fulfill({ body: JSON.stringify(body), contentType: "application/json", status }),
  )
}

const successBody = {
  data: {
    accessToken: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    refreshToken: "refresh-token",
    token: "access-token",
  },
  message: "Login successful.",
  status: "Success",
  tenantId: "public",
}

const fillCredentials = async (page: Page, email: string, password: string) => {
  await page.getByRole("textbox", { name: "E-mail" }).fill(email)
  await page.getByLabel(/^Senha/).fill(password)
}

const signIn = async (page: Page) => {
  await mockLogin(page, 200, successBody)
  await page.goto("/login")
  await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
}

test.describe("login page", () => {
  test("is where the app starts", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole("heading", { level: 1, name: "Acesse sua jornada SchoolFlow360º" })).toBeVisible()
  })

  test("asks for e-mail and password, with no way to sign up", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveAttribute("autocomplete", "username")
    await expect(page.getByLabel(/^Senha/)).toHaveAttribute("autocomplete", "current-password")
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/recuperar-senha")
    await expect(page.getByText(/cadastr|criar conta/i)).toHaveCount(0)
  })

  test("points out missing fields instead of calling the backend", async ({ page }) => {
    let called = false
    await page.route(loginEndpoint, (route) => {
      called = true
      return route.abort()
    })
    await page.goto("/login")

    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe seu e-mail.")).toBeVisible()
    await expect(page.getByText("Informe sua senha.")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveAttribute("aria-invalid", "true")
    expect(called).toBe(false)
  })

  test("points out a malformed e-mail", async ({ page }) => {
    await page.goto("/login")

    await fillCredentials(page, "diretor@escola", "senha")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible()
  })

  test("submits with the Enter key", async ({ page }) => {
    await mockLogin(page, 200, successBody)
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
    await page.getByLabel(/^Senha/).press("Enter")

    await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
  })

  test("sends e-mail, password and the tenant to the backend", async ({ page }) => {
    let body: unknown
    let tenantHeader: string | undefined
    await page.route(loginEndpoint, (route) => {
      body = route.request().postDataJSON()
      tenantHeader = route.request().headers()["x-tenant-id"]
      return route.fulfill({ body: JSON.stringify(successBody), contentType: "application/json" })
    })
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
    expect(body).toEqual({ email: "diretor@schoolflow360.com.br", password: "senha-correta" })
    expect(tenantHeader).toBe("schoolflow_demo")
  })

  test("tells the user when the credentials are wrong", async ({ page }) => {
    await mockLogin(page, 401, { data: null, message: "Invalid credentials.", status: "Error", tenantId: "public" })
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-errada")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByRole("alert")).toHaveText("Credenciais incorretas")
    await expect(page).toHaveURL(/\/login$/)

    // Both fields are flagged, described by the message, and cleared as soon as one is edited.
    for (const field of [page.getByRole("textbox", { name: "E-mail" }), page.getByLabel(/^Senha/)]) {
      await expect(field).toHaveAttribute("aria-invalid", "true")
      await expect(field).toHaveAccessibleDescription("Credenciais incorretas")
    }

    await page.getByLabel(/^Senha/).fill("outra-senha")

    await expect(page.getByRole("alert")).toHaveCount(0)
    await expect(page.getByRole("textbox", { name: "E-mail" })).not.toHaveAttribute("aria-invalid")
  })

  test("clears the previous error on a new attempt", async ({ page }) => {
    await mockLogin(page, 401, { data: null, message: "Invalid credentials.", status: "Error", tenantId: "public" })
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-errada")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByRole("alert")).toHaveText("Credenciais incorretas")

    await page.getByRole("textbox", { name: "E-mail" }).fill("")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe seu e-mail.")).toBeVisible()
    await expect(page.getByText("Credenciais incorretas")).toHaveCount(0)
  })

  test("tells the user to try again when the backend can't be reached", async ({ page }) => {
    await page.route(loginEndpoint, (route) => route.abort("connectionrefused"))
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByRole("alert")).toHaveText("Não foi possível entrar agora. Tente novamente em instantes.")
  })
})

test.describe("access control", () => {
  test("sends a visitor without a session from an inner page to the login", async ({ page }) => {
    await page.goto("/administracao/minha-escola")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("sends an unknown address to the login", async ({ page }) => {
    await page.goto("/pagina-que-nao-existe")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("keeps a signed-in user on inner pages after a reload", async ({ page }) => {
    await signIn(page)

    await page.reload()

    await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
    await expect(page.getByRole("heading", { level: 1, name: "Minha Escola" })).toBeVisible()
  })

  test("sends a signed-in user away from the login page", async ({ page }) => {
    await signIn(page)

    await page.goto("/login")

    await expect(page).toHaveURL(/\/administracao\/minha-escola$/)
  })

  test("doesn't keep the token in storage as plain text", async ({ page }) => {
    await signIn(page)

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))

    expect(storage).not.toContain("access-token")
  })
})
