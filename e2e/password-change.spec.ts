import { apiAnswer, expect, type Page, signedInUser, test } from "./support/test.ts"
import { apiError } from "./support/userAccess.ts"

// The own password change: forced after a temporary password (the backend answers nothing else until
// then) and voluntary from the profile. The backend is mocked; /api/me says whether the change is
// still pending.

type PasswordMock = {
  // The bodies sent to POST /api/me/password.
  bodies: unknown[]
  // Whether the change is still pending, as /api/me answers it.
  pending: () => boolean
}

const mockPassword = async (page: Page, options: { pending: boolean; refusal?: string }): Promise<PasswordMock> => {
  let pending = options.pending
  let refusal = options.refusal
  const bodies: unknown[] = []

  await page.route("**/api/me", (route) => route.fulfill(apiAnswer({ ...signedInUser, mustChangePassword: pending })))
  await page.route("**/api/me/password", (route) => {
    bodies.push(route.request().postDataJSON())
    if (refusal) {
      const code = refusal
      refusal = undefined
      return route.fulfill(apiError(422, code))
    }

    pending = false
    return route.fulfill(apiAnswer(null))
  })

  return { bodies, pending: () => pending }
}

// Signs in; the login says who signed in, with the temporary password flag when `pending`.
const signIn = async (page: Page, pending: boolean) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill(
      apiAnswer({
        accessToken: null,
        context: { ...signedInUser, mustChangePassword: pending },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        refreshToken: "refresh-token",
        token: "access-token",
      }),
    ),
  )
  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail ou apelido" }).fill("ana.souza")
  await page.getByLabel(/^Senha/).fill("Temporaria-123")
  await page.getByRole("button", { name: "Entrar" }).click()
}

const fillChange = async (page: Page, current: string, next: string, confirmation = next) => {
  await page.getByLabel(/^Senha (temporária|atual)/).fill(current)
  await page.getByLabel(/^Nova senha/).fill(next)
  await page.getByLabel(/^Confirmar nova senha/).fill(confirmation)
}

test.describe("forced password change", () => {
  test("asks for an own password right after signing in with a temporary one", async ({ page }) => {
    const password = await mockPassword(page, { pending: true, refusal: "CURRENT_PASSWORD_INVALID" })
    await signIn(page, true)

    await expect(page).toHaveURL(/\/change-password\?redirect=%2Fhome$/)
    await expect(page.getByRole("heading", { level: 1, name: "Crie sua senha" })).toBeVisible()

    // The temporary password typed wrong: said on its own field, and nothing else changes.
    await fillChange(page, "Temporaria-errada", "minha-senha-nova")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()
    await expect(page.getByLabel(/^Senha temporária/)).toHaveAccessibleDescription("A senha atual não confere.")

    await fillChange(page, "Temporaria-123", "minha-senha-nova")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByText("Senha alterada.")).toBeVisible()
    expect(password.bodies.at(-1)).toEqual({ currentPassword: "Temporaria-123", newPassword: "minha-senha-nova" })
  })

  test("checks the new password before sending it", async ({ page }) => {
    const password = await mockPassword(page, { pending: true })
    await signIn(page, true)
    await expect(page).toHaveURL(/\/change-password/)

    await fillChange(page, "Temporaria-123", "curta")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()
    await expect(page.getByLabel(/^Nova senha/)).toHaveAccessibleDescription("Use de 12 a 128 caracteres.")

    await fillChange(page, "Temporaria-123", "Temporaria-123")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()
    await expect(page.getByLabel(/^Nova senha/)).toHaveAccessibleDescription(
      "A nova senha precisa ser diferente da atual.",
    )

    await fillChange(page, "Temporaria-123", "minha-senha-nova", "outra-senha-nova")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()
    await expect(page.getByLabel(/^Confirmar nova senha/)).toHaveAccessibleDescription("As senhas não coincidem.")

    expect(password.bodies).toEqual([])
  })

  test("keeps every page closed until the change, then opens the one asked for", async ({ page }) => {
    await mockPassword(page, { pending: true })
    await signIn(page, true)
    await expect(page).toHaveURL(/\/change-password/)

    await page.goto("/account/profile")
    await expect(page).toHaveURL(/\/change-password\?redirect=%2Faccount%2Fprofile$/)

    await fillChange(page, "Temporaria-123", "minha-senha-nova")
    await page.getByRole("button", { name: "Salvar nova senha" }).click()

    await expect(page).toHaveURL(/\/account\/profile$/)
    await expect(page.getByRole("heading", { level: 1, name: "Meu perfil" })).toBeVisible()
  })

  test("goes to the change when the backend refuses a call for it", async ({ page }) => {
    const password = await mockPassword(page, { pending: false })
    await signIn(page, false)
    await expect(page).toHaveURL(/\/home$/)

    // The backend now wants the change (the stored session doesn't know yet): any call says so.
    await page.route("**/api/me", (route) => route.fulfill(apiAnswer({ ...signedInUser, mustChangePassword: true })))
    await page.route("**/api/me/sessions", (route) => route.fulfill(apiError(403, "PASSWORD_CHANGE_REQUIRED")))
    await page.goto("/access-logs/active-sessions")

    await expect(page).toHaveURL(/\/change-password\?redirect=%2Faccess-logs%2Factive-sessions$/)
    await expect(page.getByRole("heading", { level: 1, name: "Crie sua senha" })).toBeVisible()
    expect(password.pending()).toBe(false)
  })

  test("opens nothing for a session that doesn't need the change", async ({ page }) => {
    await mockPassword(page, { pending: false })
    await signIn(page, false)
    await expect(page).toHaveURL(/\/home$/)

    await page.goto("/change-password?redirect=%2Faccount%2Fprofile")

    await expect(page).toHaveURL(/\/account\/profile$/)
  })

  test("lets the person sign out instead", async ({ page }) => {
    await mockPassword(page, { pending: true })
    await signIn(page, true)
    await expect(page).toHaveURL(/\/change-password/)

    await page.getByRole("link", { name: "Sair" }).click()

    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe("password change from the profile", () => {
  test("changes the own password, pointing out a new one equal to the current", async ({ page }) => {
    const password = await mockPassword(page, { pending: false, refusal: "PASSWORD_UNCHANGED" })
    await signIn(page, false)
    await expect(page).toHaveURL(/\/home$/)
    await page.goto("/account/profile")

    await page.getByRole("button", { name: "Alterar senha" }).click()
    const dialog = page.getByRole("dialog", { name: "Alterar senha" })
    await fillChange(page, "senha-atual-123", "senha-nova-1234")
    await dialog.getByRole("button", { name: "Salvar nova senha" }).click()
    await expect(dialog.getByLabel(/^Nova senha/)).toHaveAccessibleDescription(
      "A nova senha precisa ser diferente da atual.",
    )

    await fillChange(page, "senha-atual-123", "senha-nova-5678")
    await dialog.getByRole("button", { name: "Salvar nova senha" }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page.getByText("Senha alterada.")).toBeVisible()
    expect(password.bodies.at(-1)).toEqual({ currentPassword: "senha-atual-123", newPassword: "senha-nova-5678" })
  })
})
