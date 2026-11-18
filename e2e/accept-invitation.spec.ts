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
// What validate answers by default: an invitation with a name and phone, granting a unit and the
// institution.
const validInvitation = {
  assignments: [
    { role: "SECRETARIA", unitId: 7, unitName: "Unidade Centro" },
    { role: "PROFESSOR", unitId: 7, unitName: "Unidade Centro" },
  ],
  email: "ma***@horizonte.edu.br",
  expiresAt: "2026-11-17T15:00:00Z",
  fullName: "Maria Souza",
  institutionName: "Instituto Educacional Horizonte Ltda.",
  nameRequired: false,
  organizationName: "Colégio Horizonte",
  phone: "+55 85 98888 1100",
  privacyUrl: null,
  termsUrl: null,
  termsVersion: "1.0",
  valid: true,
}

const mockInvitation = async (
  page: Page,
  options: {
    acceptAnswer?: { body: string; contentType: string; status: number }
    invitation?: Record<string, unknown>
    validateStatus?: number
  } = {},
) => {
  const validateTenants: (string | undefined)[] = []
  const acceptCalls: AcceptCall[] = []

  await page.route("**/api/auth/invitations/validate", (route) => {
    validateTenants.push(route.request().headers()["x-tenant-id"])
    if (options.validateStatus) return route.fulfill(errorBody(options.validateStatus, "INVITATION_INVALID"))

    return route.fulfill(apiAnswer({ ...validInvitation, ...options.invitation }))
  })
  await page.route("**/api/auth/invitations/accept", (route) => {
    acceptCalls.push({ body: route.request().postDataJSON(), tenant: route.request().headers()["x-tenant-id"] })
    return route.fulfill(options.acceptAnswer ?? { ...apiAnswer(null), status: 201 })
  })

  return { acceptCalls, validateTenants }
}

const termsCheckbox = (page: Page) => page.getByRole("checkbox", { name: /Li e aceito os Termos de Uso/ })

const fillPasswords = async (page: Page, password: string, confirmation = password, acceptTerms = true) => {
  await page.getByLabel(/^Senha/).fill(password)
  await page.getByLabel(/^Confirmar senha/).fill(confirmation)
  if (acceptTerms) await termsCheckbox(page).check()
}

test.describe("accept invitation", () => {
  test("shows the invitation, creates the account with the person's own password and goes to the login", async ({
    page,
  }) => {
    const { acceptCalls, validateTenants } = await mockInvitation(page)
    await page.goto(invitationLink)

    await expect(page.getByRole("heading", { level: 1, name: "Ative sua conta" })).toBeVisible()
    await expect(page.getByText(/acessar Colégio Horizonte com o e-mail ma\*\*\*@horizonte\.edu\.br/)).toBeVisible()
    await expect(page.getByText(/^O convite vale até /)).toBeVisible()
    await expect(page.getByText("Secretaria · Unidade Centro")).toBeVisible()
    await expect(page.getByText("Professor · Unidade Centro")).toBeVisible()
    // The invitation's own name and phone come filled in.
    await expect(page.getByLabel(/^Nome completo/)).toHaveValue("Maria Souza")
    await expect(page.getByLabel(/^Telefone/)).toHaveValue("(85) 98888-1100")

    await fillPasswords(page, "senha-nova-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText("Conta ativada. Entre com seu e-mail e a senha que você criou.")).toBeVisible()
    // Both calls go to the school named in the link.
    expect(validateTenants).toEqual(["escola_horizonte"])
    expect(acceptCalls).toEqual([
      {
        body: {
          fullName: "Maria Souza",
          password: "senha-nova-segura",
          termsAccepted: true,
          termsVersion: "1.0",
          token: "invite-token",
        },
        tenant: "escola_horizonte",
      },
    ])
  })

  test("asks for the name an invitation came without, and sends what the person typed", async ({ page }) => {
    const { acceptCalls } = await mockInvitation(page, {
      invitation: {
        assignments: [{ role: "ADMIN", unitId: null, unitName: null }],
        fullName: null,
        institutionName: null,
        nameRequired: true,
        organizationName: null,
        phone: null,
      },
    })
    await page.goto(invitationLink)

    await expect(page.getByText(/acessar o sistema da escola com o e-mail/)).toBeVisible()
    await expect(page.getByText("Administrador · Toda a instituição")).toBeVisible()
    await expect(page.getByLabel(/^Nome completo/)).toHaveValue("")

    await fillPasswords(page, "senha-nova-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()
    await expect(page.getByText("Informe seu nome completo.")).toBeVisible()

    await page.getByLabel(/^Telefone/).fill("85 3333 1100")
    await expect(page.getByLabel(/^Telefone/)).toHaveValue("(85) 3333-1100")
    await page.getByLabel(/^Telefone/).fill("123")
    await page.getByLabel(/^Nome completo/).fill("  Ana Lima ")
    await page.getByRole("button", { name: "Ativar conta" }).click()
    await expect(page.getByText("Informe um telefone válido, com DDD.")).toBeVisible()
    expect(acceptCalls).toEqual([])

    await page.getByLabel(/^Telefone/).fill("85 3333 1100")
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page).toHaveURL(/\/login$/)
    expect(acceptCalls.map((call) => call.body)).toEqual([
      {
        fullName: "Ana Lima",
        password: "senha-nova-segura",
        phone: "+55 85 3333 1100",
        termsAccepted: true,
        termsVersion: "1.0",
        token: "invite-token",
      },
    ])
  })

  test("points out a missing name the backend refuses, keeping the invitation usable", async ({ page }) => {
    await mockInvitation(page, { acceptAnswer: errorBody(422, "NAME_REQUIRED") })
    await page.goto(invitationLink)

    await fillPasswords(page, "senha-nova-segura")
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page.getByText("Informe seu nome completo.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Ativar conta" })).toBeEnabled()
  })

  test("requires the Terms of Use, in the version in force, before creating the account", async ({ page }) => {
    const { acceptCalls } = await mockInvitation(page)
    await page.goto(invitationLink)

    await expect(termsCheckbox(page)).toHaveAccessibleName(/\(versão 1\.0\)/)
    await fillPasswords(page, "senha-nova-segura", "senha-nova-segura", false)
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page.getByText("Aceite os Termos de Uso e o Aviso de Privacidade para ativar a conta.")).toBeVisible()
    expect(acceptCalls).toEqual([])
  })

  test("links the Terms of Use and the Privacy Notice only once the backend publishes them", async ({ page }) => {
    await mockInvitation(page)
    await page.goto(invitationLink)
    await expect(termsCheckbox(page)).toBeVisible()
    await expect(page.getByRole("link", { name: "Ler os Termos de Uso" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Ler o Aviso de Privacidade" })).toHaveCount(0)

    await mockInvitation(page, {
      invitation: { privacyUrl: "https://example.test/privacidade", termsUrl: "https://example.test/termos" },
    })
    await page.reload()
    const terms = page.getByRole("link", { name: "Ler os Termos de Uso" })
    await expect(terms).toHaveAttribute("href", "https://example.test/termos")
    await expect(terms).toHaveAttribute("target", "_blank")
    await expect(page.getByRole("link", { name: "Ler o Aviso de Privacidade" })).toHaveAttribute(
      "href",
      "https://example.test/privacidade",
    )
  })

  test("asks for the terms again when they changed while the form was open, keeping what was typed", async ({
    page,
  }) => {
    await mockInvitation(page, { acceptAnswer: errorBody(422, "TERMS_VERSION_INVALID") })
    await page.goto(invitationLink)
    await fillPasswords(page, "senha-nova-segura")

    // The backend now has version 1.1.
    await mockInvitation(page, { invitation: { termsVersion: "1.1" } })
    await page.unroute("**/api/auth/invitations/accept")
    await page.route("**/api/auth/invitations/accept", (route) =>
      route.fulfill(errorBody(422, "TERMS_VERSION_INVALID")),
    )
    await page.getByRole("button", { name: "Ativar conta" }).click()

    await expect(page.getByText(/Os Termos de Uso foram atualizados \(versão 1\.1\)/)).toBeVisible()
    await expect(termsCheckbox(page)).not.toBeChecked()
    await expect(termsCheckbox(page)).toHaveAccessibleName(/\(versão 1\.1\)/)
    await expect(page.getByLabel(/^Senha/)).toHaveValue("senha-nova-segura")
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
