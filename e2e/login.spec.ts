import { expect, type Page, test } from "./support/test.ts"

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
  await page.getByRole("textbox", { name: "E-mail ou apelido" }).fill(email)
  await page.getByLabel(/^Senha/).fill(password)
}

const signIn = async (page: Page) => {
  await mockLogin(page, 200, successBody)
  await page.goto("/login")
  await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)
}

test.describe("login page", () => {
  test("is where the app starts", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible()
  })

  test("asks for the e-mail or nickname and the password, with no way to sign up", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("textbox", { name: "E-mail ou apelido" })).toHaveAttribute("autocomplete", "username")
    await expect(page.getByLabel(/^Senha/)).toHaveAttribute("autocomplete", "current-password")
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/forgot-password")
    await expect(page.getByText(/cadastr|criar conta/i)).toHaveCount(0)
  })

  test("asks for the background photo as soon as it opens", async ({ page }) => {
    await page.goto("/login")

    await expect(page.locator("link[rel='preload'][as='image']")).toHaveAttribute("href", /login-library/)
  })

  test("shows and hides the typed password", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/^Senha/).fill("senha-correta")

    await page.getByRole("button", { name: "Mostrar senha" }).click()
    await expect(page.getByLabel(/^Senha/)).toHaveAttribute("type", "text")
    await expect(page.getByLabel(/^Senha/)).toHaveValue("senha-correta")

    await page.getByRole("button", { name: "Ocultar senha" }).click()
    await expect(page.getByLabel(/^Senha/)).toHaveAttribute("type", "password")
  })

  test("points out missing fields instead of calling the backend", async ({ page }) => {
    let called = false
    await page.route(loginEndpoint, (route) => {
      called = true
      return route.abort()
    })
    await page.goto("/login")

    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe seu e-mail ou apelido.")).toBeVisible()
    await expect(page.getByText("Informe sua senha.")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "E-mail ou apelido" })).toHaveAttribute("aria-invalid", "true")
    expect(called).toBe(false)
  })

  test("points out a malformed e-mail", async ({ page }) => {
    await page.goto("/login")

    await fillCredentials(page, "diretor@escola", "senha")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe um e-mail válido ou o seu apelido.")).toBeVisible()
  })

  test("submits with the Enter key", async ({ page }) => {
    await mockLogin(page, 200, successBody)
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
    await page.getByLabel(/^Senha/).press("Enter")

    await expect(page).toHaveURL(/\/home$/)
  })

  test("won't sign in on an address where the browser can't keep the session", async ({ page }) => {
    // An http network address (http://192.168.0.6:5173) isn't a secure context: no crypto.subtle.
    await page.addInitScript(() => Object.defineProperty(globalThis.crypto, "subtle", { value: undefined }))
    let loginCalls = 0
    await page.route(loginEndpoint, (route) => {
      loginCalls += 1
      return route.fulfill({ body: JSON.stringify(successBody), contentType: "application/json", status: 200 })
    })

    await page.goto("/login")
    await expect(page.getByRole("alert").first()).toContainText("Este endereço não é seguro")
    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/login$/)
    // No session is opened on the backend that this page couldn't keep.
    expect(loginCalls).toBe(0)
  })

  test("sends the e-mail, the password and the tenant to the backend", async ({ page }) => {
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

    await expect(page).toHaveURL(/\/home$/)
    expect(body).toEqual({ login: "diretor@schoolflow360.com.br", password: "senha-correta" })
    expect(tenantHeader).toBe("schoolflow_demo")
  })

  test("signs in with a nickname too", async ({ page }) => {
    let body: unknown
    await page.route(loginEndpoint, (route) => {
      body = route.request().postDataJSON()
      return route.fulfill({ body: JSON.stringify(successBody), contentType: "application/json" })
    })
    await page.goto("/login")

    await fillCredentials(page, " Ana.Souza_2 ", "senha-correta")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/home$/)
    expect(body).toEqual({ login: "Ana.Souza_2", password: "senha-correta" })
  })

  test("points out what can't be an e-mail or a nickname before sending it", async ({ page }) => {
    let calls = 0
    await page.route(loginEndpoint, (route) => {
      calls += 1
      return route.fulfill({ body: JSON.stringify(successBody), contentType: "application/json" })
    })
    await page.goto("/login")

    for (const typed of ["diretor@escola", "ana souza", "ab"]) {
      await fillCredentials(page, typed, "senha-correta")
      await page.getByRole("button", { name: "Entrar" }).click()
      await expect(page.getByText("Informe um e-mail válido ou o seu apelido.")).toBeVisible()
    }
    expect(calls).toBe(0)
  })

  test("tells the user when the credentials are wrong", async ({ page }) => {
    await mockLogin(page, 401, { data: null, message: "Invalid credentials.", status: "Error", tenantId: "public" })
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-errada")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByRole("alert")).toHaveText(
      "Não foi possível entrar. Verifique o e-mail ou apelido e a senha, ou fale com a secretaria.",
    )
    await expect(page).toHaveURL(/\/login$/)

    // Both fields are flagged, described by the message, and cleared as soon as one is edited.
    for (const field of [page.getByRole("textbox", { name: "E-mail ou apelido" }), page.getByLabel(/^Senha/)]) {
      await expect(field).toHaveAttribute("aria-invalid", "true")
      await expect(field).toHaveAccessibleDescription(
        "Não foi possível entrar. Verifique o e-mail ou apelido e a senha, ou fale com a secretaria.",
      )
    }

    await page.getByLabel(/^Senha/).fill("outra-senha")

    await expect(page.getByRole("alert")).toHaveCount(0)
    await expect(page.getByRole("textbox", { name: "E-mail ou apelido" })).not.toHaveAttribute("aria-invalid")
  })

  test("clears the previous error on a new attempt", async ({ page }) => {
    await mockLogin(page, 401, { data: null, message: "Invalid credentials.", status: "Error", tenantId: "public" })
    await page.goto("/login")

    await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-errada")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByRole("alert")).toHaveText(
      "Não foi possível entrar. Verifique o e-mail ou apelido e a senha, ou fale com a secretaria.",
    )

    await page.getByRole("textbox", { name: "E-mail ou apelido" }).fill("")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Informe seu e-mail ou apelido.")).toBeVisible()
    await expect(
      page.getByText("Não foi possível entrar. Verifique o e-mail ou apelido e a senha, ou fale com a secretaria."),
    ).toHaveCount(0)
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
    await page.goto("/administration/my-organization")

    await expect(page).toHaveURL(/\/login\?redirect=%2Fadministration%2Fmy-organization$/)
  })

  test("sends an unknown address to the login", async ({ page }) => {
    await page.goto("/pagina-que-nao-existe")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("keeps a signed-in user on inner pages after a reload", async ({ page }) => {
    await signIn(page)

    await page.reload()

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole("complementary").getByRole("button", { name: "Início" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("sends a signed-in user away from the login page", async ({ page }) => {
    await signIn(page)

    await page.goto("/login")

    await expect(page).toHaveURL(/\/home$/)
  })

  test("doesn't keep the token in storage as plain text", async ({ page }) => {
    await signIn(page)

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))

    expect(storage).not.toContain("access-token")
  })
})

// With 5 sessions open the backend refuses a 6th with a 409 that carries a challenge and the sessions.
const chromeOnWindows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const safariOnIphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"

const sessionLimitBody = {
  code: "SESSION_LIMIT_REACHED",
  data: {
    challengeExpiresInSeconds: 300,
    challengeToken: "challenge-1",
    sessions: [
      { createdAt: "2026-11-10T13:30:00Z", current: false, expiresAt: "", id: "s1", userAgent: chromeOnWindows },
      { createdAt: "2026-11-12T09:05:00Z", current: false, expiresAt: "", id: "s2", userAgent: safariOnIphone },
    ],
  },
  message: "The limit of active sessions was reached.",
  status: "Error",
  tenantId: "schoolflow_demo",
}

const signInAtLimit = async (page: Page) => {
  await mockLogin(page, 409, sessionLimitBody)
  await page.goto("/login")
  await fillCredentials(page, "diretor@schoolflow360.com.br", "senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()

  return page.getByRole("dialog", { name: "Limite de sessões atingido" })
}

const mockReplace = async (page: Page, status: number, body: unknown) => {
  const bodies: unknown[] = []
  await page.route("**/api/auth/session-limit/replace", (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ body: JSON.stringify(body), contentType: "application/json", status })
  })
  return bodies
}

test.describe("session limit", () => {
  test("lists the open sessions and signs in after ending the chosen one", async ({ page }) => {
    const dialog = await signInAtLimit(page)
    const replaceBodies = await mockReplace(page, 200, successBody)

    await expect(dialog.getByText("Chrome no Windows")).toBeVisible()
    await expect(dialog.getByText("Safari no iOS")).toBeVisible()
    await expect(dialog.getByText(/^Iniciada em \d{2}\/\d{2}\/\d{4}/).first()).toBeVisible()

    await dialog.getByRole("button", { name: /^Encerrar a sessão Safari no iOS/ }).click()

    await expect(page).toHaveURL(/\/home$/)
    expect(replaceBodies).toEqual([{ challengeToken: "challenge-1", sessionId: "s2" }])
  })

  test("drops a session that was already ended elsewhere, keeping the others to choose from", async ({ page }) => {
    const dialog = await signInAtLimit(page)
    await mockReplace(page, 404, { code: "SESSION_NOT_FOUND", data: null, message: "", status: "Error" })

    await dialog.getByRole("button", { name: /^Encerrar a sessão Chrome no Windows/ }).click()

    await expect(dialog.getByRole("alert")).toHaveText("Essa sessão já tinha sido encerrada. Escolha outra.")
    await expect(dialog.getByText("Chrome no Windows")).toHaveCount(0)
    await expect(dialog.getByText("Safari no iOS")).toBeVisible()
  })

  test("sends the person back to sign in again when the time to choose ran out", async ({ page }) => {
    const dialog = await signInAtLimit(page)
    await mockReplace(page, 401, { code: "CHALLENGE_INVALID", data: null, message: "", status: "Error" })

    await dialog.getByRole("button", { name: /^Encerrar a sessão Chrome no Windows/ }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("alert")).toHaveText("O tempo para escolher uma sessão acabou. Entre novamente.")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("cancels the sign-in without ending any session", async ({ page }) => {
    const dialog = await signInAtLimit(page)
    const replaceBodies = await mockReplace(page, 200, successBody)

    await dialog.getByRole("button", { name: "Cancelar login" }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/login$/)
    expect(replaceBodies).toEqual([])
  })
})
