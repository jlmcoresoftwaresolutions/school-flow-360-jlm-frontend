import { expect, type Page, test } from "./support/test.ts"
import { lastCall, mockUserAccessApi, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

const usersPath = "/users/list"

const table = (page: Page) => page.getByRole("table")
const rowOf = (page: Page, name: string) => table(page).getByRole("row").filter({ hasText: name })

const pick = async (page: Page, scope: Page | ReturnType<Page["getByRole"]>, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("user list", () => {
  test("lists each person's active roles in their units and the account's status", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    await expect(page.getByRole("heading", { level: 1, name: "Lista de Usuários" })).toBeVisible()
    await expect(rowOf(page, "João Silva")).toContainText("Administrador · Toda a instituição")
    await expect(rowOf(page, "Maria Souza")).toContainText("Secretaria · Unidade Aldeota")
    await expect(rowOf(page, "Maria Souza")).toContainText("Professor · Unidade Caucaia")
    // A revoked role isn't shown as access.
    await expect(rowOf(page, "Maria Souza")).not.toContainText("Unidade Benfica")
    await expect(rowOf(page, "Maria Souza")).toContainText("Ativo")
    await expect(rowOf(page, "Pedro Lima")).toContainText("Inativo")

    expect(lastCall(calls, "GET", "/api/users")?.query).toMatchObject({
      direction: "asc",
      page: "0",
      sortBy: "fullName",
    })
  })

  test("searches and filters on the backend, starting over from the first page", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)
    await expect(rowOf(page, "Pedro Lima")).toBeVisible()

    await page.getByRole("searchbox", { name: "Buscar usuários" }).fill("maria")
    await expect(rowOf(page, "Pedro Lima")).toHaveCount(0)
    await expect(rowOf(page, "Maria Souza")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/users")?.query.q).toBe("maria")

    await page.getByRole("button", { name: "Limpar filtros" }).click()
    await pick(page, page, /^Situação/, "Inativos")
    await expect(rowOf(page, "Maria Souza")).toHaveCount(0)
    await expect(rowOf(page, "Pedro Lima")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/users")?.query).toMatchObject({ page: "0", status: "INACTIVE" })

    await page.getByRole("button", { name: "Limpar filtros" }).click()
    await pick(page, page, /^Unidade/, "Unidade Benfica (inativa)")
    await expect(table(page)).toContainText("Nenhum usuário encontrado com esses filtros.")
    expect(lastCall(calls, "GET", "/api/users")?.query.unitId).toBe("4")
  })

  test("shows a user's details: access, what it allows and the access revoked before", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    await rowOf(page, "Maria Souza").getByRole("button", { name: "Ações de Maria Souza" }).click()
    await page.getByRole("menuitem", { name: "Ver detalhes" }).click()

    const dialog = page.getByRole("dialog", { name: "Detalhes do usuário" })
    await expect(dialog).toContainText("maria.souza@horizonte.edu.br")
    await expect(dialog).toContainText("(85) 98888-1100")
    await expect(dialog.getByRole("region", { name: "Papéis e unidades" })).toContainText(
      "Secretaria · Unidade Aldeota",
    )
    await expect(dialog.getByRole("region", { name: "O que este acesso permite" })).toContainText(
      "Usuários, convites e auditoria das suas unidades.",
    )
    await expect(dialog.getByRole("region", { name: "Acessos revogados" })).toContainText(
      "Professor · Unidade Benfica (inativa)",
    )
    // No control to adjust permissions one by one.
    await expect(dialog.getByRole("checkbox")).toHaveCount(0)
    await expect(dialog.getByRole("switch")).toHaveCount(0)

    await dialog.getByRole("button", { name: "Fechar" }).last().click()
    await expect(dialog).toHaveCount(0)
  })

  test("tells an institution without users, a failure and a refusal apart", async ({ page }) => {
    await mockUserAccessApi(page, { users: [] })
    await signInAndOpen(page, usersPath)
    await expect(page.getByText("Nenhum usuário ainda")).toBeVisible()
    await expect(page.getByRole("button", { name: "Convidar usuário" })).toBeVisible()

    await mockUserAccessApi(page, { listStatus: { users: 503 } })
    await page.reload()
    await expect(page.getByText("Não foi possível carregar os usuários")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()

    await mockUserAccessApi(page, { listStatus: { users: 403 } })
    await page.reload()
    await expect(page.getByText("Você não tem acesso a esta lista")).toBeVisible()
  })
})

test.describe("inviting and registering", () => {
  test("invites a person after reviewing the recipient, the roles and the units", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    await page.getByRole("button", { name: "Convidar usuário" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar usuário" })

    // Nothing can be sent without the e-mail, the role and the unit.
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog.getByText("Informe o e-mail.")).toBeVisible()
    await expect(dialog.getByText("Escolha o papel.")).toBeVisible()

    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("  Nova.Pessoa@Horizonte.edu.br ")
    await pick(page, dialog, /^Papel/, "Professor")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog.getByText("Escolha a unidade.")).toBeVisible()
    // An inactive unit isn't offered.
    await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
    await expect(page.getByRole("option", { name: "Unidade Benfica" })).toHaveCount(0)
    await page.getByRole("option", { exact: true, name: "Unidade Caucaia" }).click()

    // A second role: Admin is for the whole institution, so it has no unit.
    await dialog.getByRole("button", { name: "Adicionar papel" }).click()
    const second = dialog.getByRole("group", { name: "Papel 2" })
    await pick(page, second, /^Papel/, "Administrador")
    await expect(second.getByRole("combobox", { name: /^Unidade/ })).toHaveCount(0)
    await expect(second).toContainText("Toda a instituição")

    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog).toContainText("O convite vai para nova.pessoa@horizonte.edu.br")
    await expect(dialog).toContainText("Informado pela pessoa ao ativar a conta")
    await expect(dialog).toContainText("Administrador · Toda a instituição")
    await expect(dialog).toContainText("Professor · Unidade Caucaia")

    await dialog.getByRole("button", { name: "Enviar convite" }).click()
    await expect(page.getByText("Convite enviado para nova.pessoa@horizonte.edu.br.")).toBeVisible()
    await expect(dialog).toHaveCount(0)

    const sent = lastCall(calls, "POST", "/api/invitations")!
    expect(sent.body).toEqual({
      assignments: [
        { roleCode: "PROFESSOR", schoolUnitId: 2 },
        { roleCode: "ADMIN", schoolUnitId: null },
      ],
      email: "nova.pessoa@horizonte.edu.br",
    })
    expect(sent.headers["idempotency-key"]).toBeTruthy()
  })

  test("takes a refused e-mail back to the form, and retries a send without answer with the same key", async ({
    page,
  }) => {
    const { calls } = await mockUserAccessApi(page, { createFailure: { code: "INVITATION_PENDING", status: 409 } })
    await signInAndOpen(page, usersPath)

    await page.getByRole("button", { name: "Convidar usuário" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar usuário" })
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("ana.lima@horizonte.edu.br")
    await pick(page, dialog, /^Papel/, "Professor")
    await pick(page, dialog, /^Unidade/, "Unidade Caucaia")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Enviar convite" }).click()

    await expect(dialog.getByText(/Já há um convite pendente para este e-mail/)).toBeVisible()
    await expect(dialog.getByRole("textbox", { name: /^E-mail/ })).toHaveValue("ana.lima@horizonte.edu.br")

    // Without an answer, trying again sends the same Idempotency-Key: the backend returns the same invitation.
    await mockUserAccessApi(page, { createFailure: "timeout" })
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("outra@horizonte.edu.br")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Enviar convite" }).click()
    await expect(dialog.getByText(/Não houve resposta/)).toBeVisible()
    const firstKey = lastCall(calls, "POST", "/api/invitations")?.headers["idempotency-key"]

    await dialog.getByRole("button", { name: "Enviar convite" }).click()
    await expect(page.getByText("Convite enviado para outra@horizonte.edu.br.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/invitations")?.headers["idempotency-key"]).toBe(firstKey)
  })

  test("registers a person by hand, with the name required and no password", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    await page.getByRole("button", { name: "Cadastrar usuário" }).click()
    const dialog = page.getByRole("dialog", { name: "Cadastrar usuário" })
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("rita@horizonte.edu.br")
    await pick(page, dialog, /^Papel/, "Secretaria")
    await pick(page, dialog, /^Unidade/, "Unidade Aldeota")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog.getByText("Informe o nome completo.")).toBeVisible()

    await dialog.getByRole("textbox", { name: /^Nome completo/ }).fill("Rita Alves")
    await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("85 98888 2200")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog).toContainText("rita@horizonte.edu.br vai receber um link")
    await dialog.getByRole("button", { name: "Cadastrar usuário" }).click()

    await expect(page.getByText(/Usuário cadastrado\. rita@horizonte\.edu\.br recebeu um link/)).toBeVisible()
    expect(lastCall(calls, "POST", "/api/users")?.body).toEqual({
      assignments: [{ roleCode: "SECRETARIA", schoolUnitId: 1 }],
      email: "rita@horizonte.edu.br",
      fullName: "Rita Alves",
      phone: "+55 85 98888 2200",
    })
  })

  test("offers a Secretaria only the roles and units it may grant", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath, secretariaContext)

    // Its units come with the session: the units list (Admin-only) isn't asked for.
    await expect(rowOf(page, "Maria Souza")).toBeVisible()
    expect(calls.some((call) => call.path === "/api/school-units")).toBe(false)

    await page.getByRole("combobox", { name: /^Papel/ }).click()
    await expect(page.getByRole("option", { name: "Administrador" })).toHaveCount(0)
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Convidar usuário" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar usuário" })
    await dialog.getByRole("combobox", { name: /^Papel/ }).click()
    await expect(page.getByRole("option")).toHaveText(["Professor", "Responsável", "Aluno"])
    // Tab closes the menu (Escape would close the dialog too).
    await page.keyboard.press("Tab")
    await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
    await expect(page.getByRole("option")).toHaveText(["Unidade Aldeota"])
  })
})
