import { apiAnswer, expect, type Page, test } from "./support/test.ts"

// The invitation e-mail links to /accept-invitation?token=...&tenant=...; the backend is mocked.
const invitationLink = "/accept-invitation?token=invite-token&tenant=escola_horizonte"

const errorBody = (status: number, code: string) => ({
  body: JSON.stringify({ code, data: null, message: code, status: "Error", tenantId: "escola_horizonte" }),
  contentType: "application/json",
  status,
})

type AcceptCall = { body: unknown; tenant: string | undefined }

// validate answers a valid invitation unless told otherwise; accept answers `acceptAnswer` (201 by
// default) and records what was sent.
const mockInvitation = async (
  page: Page,
  options: { acceptAnswer?: { body: string; contentType: string; status: number }; validateStatus?: number } = {},
) => {
  const validateTenants: (string | undefined)[] = []
  const acceptCalls: AcceptCall[] = []

  await page.route("**/api/auth/invitations/validate", (route) => {
    validateTenants.push(route.request().headers()["x-tenant-id"])
    if (options.validateStatus) return route.fulfill(errorBody(options.validateStatus, "INVITATION_INVALID"))

    return route.fulfill(apiAnswer({ email: "ma***@horizonte.edu.br", expiresAt: "2026-11-17T15:00:00Z", valid: true }))
  })
  await page.route("**/api/auth/invitations/accept", (route) => {
    acceptCalls.push({ body: route.request().postDataJSON(), tenant: route.request().headers()["x-tenant-id"] })
    return route.fulfill(options.acceptAnswer ?? { ...apiAnswer(null), status: 201 })
  })

  return { acceptCalls, validateTenants }
}

const fillPasswords = async (page: Page, password: string, confirmation = password) => {
  await page.getByLabel(/^Senha/).fill(password)
  await page.getByLabel(/^Confirmar senha/).fill(confirmation)
}

test.describe("accept invitation", () => {
  test("shows the invited e-mail, creates the account with the person's own password and goes to the login", async ({
    page,
  }) => {
    const { acceptCalls, validateTenants } = await mockInvitation(page)
    await page.goto(invitationLink)

    await expect(page.getByRole("heading", { level: 1, name: "Ative sua conta" })).toBeVisible()
    await expect(page.getByText(/com o e-mail ma\*\*\*@horizonte\.edu\.br/)).toBeVisible()
    await expect(page.getByText(/^O convite vale até /)).toBeVisible()

    await fillPasswords(page, "senha-nova-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText("Conta ativada. Entre com seu e-mail e a senha que você criou.")).toBeVisible()
    // Both calls go to the school named in the link.
    expect(validateTenants).toEqual(["escola_horizonte"])
    expect(acceptCalls).toEqual([
      { body: { password: "senha-nova-segura", token: "invite-token" }, tenant: "escola_horizonte" },
    ])
  })

  test("checks the password before sending it", async ({ page }) => {
    const { acceptCalls } = await mockInvitation(page)
    await page.goto(invitationLink)

    await fillPasswords(page, "curta")
    await page.getByRole("button", { name: "Ativar conta" }).click()
    await expect(page.getByText("Use pelo menos 12 caracteres.")).toBeVisible()

    await fillPasswords(page, "senha-nova-segura", "outra-senha-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible()

    expect(acceptCalls).toEqual([])
  })

  test("says a dead link is not available, before anything is typed", async ({ page }) => {
    await mockInvitation(page, { validateStatus: 404 })
    await page.goto(invitationLink)

    await expect(page.getByText("Este convite não está disponível")).toBeVisible()
    await expect(page.getByLabel(/^Senha/)).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login")
  })

  test("treats a link without its token or school as not available", async ({ page }) => {
    await page.goto("/accept-invitation?token=invite-token")

    await expect(page.getByText("Este convite não está disponível")).toBeVisible()
  })

  test("offers to try again when the invitation can't be checked", async ({ page }) => {
    await mockInvitation(page, { validateStatus: 503 })
    await page.goto(invitationLink)

    await expect(page.getByText("Não foi possível verificar o convite")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
  })

  const refusals = [
    { code: "INVITATION_EXPIRED", status: 422, title: "Este convite venceu" },
    { code: "INVITATION_ALREADY_USED", status: 409, title: "Este convite já foi usado" },
    { code: "USER_DUPLICATE", status: 409, title: "Você já tem uma conta" },
    { code: "UNIT_INACTIVE", status: 422, title: "Este convite não pode mais ser usado" },
  ]

  for (const refusal of refusals) {
    test(`explains why the account wasn't created: ${refusal.code}`, async ({ page }) => {
      await mockInvitation(page, { acceptAnswer: errorBody(refusal.status, refusal.code) })
      await page.goto(invitationLink)

      await fillPasswords(page, "senha-nova-segura")
      await page.getByRole("button", { name: "Ativar conta" }).click()

      await expect(page.getByText(refusal.title, { exact: true })).toBeVisible()
      await expect(page.getByLabel(/^Senha/)).toHaveCount(0)
    })
  }

  test("points out a password the backend refuses, keeping the invitation usable", async ({ page }) => {
    await mockInvitation(page, { acceptAnswer: errorBody(422, "WEAK_PASSWORD") })
    await page.goto(invitationLink)

    await fillPasswords(page, "senha-nova-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page.getByText("Use pelo menos 12 caracteres.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Ativar conta" })).toBeEnabled()
  })
})
