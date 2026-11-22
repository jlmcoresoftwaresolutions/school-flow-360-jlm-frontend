import { apiAnswer, expect, type Page, test } from "./support/test.ts"
import { lastCall, mockUserAccessApi, secretariaContext, signInAndOpen, units, users } from "./support/userAccess.ts"

// The actions on a user (Phase 3 of the P02): editing the name and phone, changing roles and units,
// revoking access and inactivating or reactivating the account. The backend is mocked
// (e2e/support/userAccess.ts) and keeps what is changed; the signed-in Admin is João Silva (id 1).

const usersPath = "/users/list"

const openDetails = async (page: Page, name: string) => {
  await page
    .getByRole("table")
    .getByRole("button", { name: `Ações de ${name}` })
    .click()
  await page.getByRole("menuitem", { name: "Ver detalhes" }).click()
  return page.getByRole("dialog", { name: "Detalhes do usuário" })
}

// The actions on the user live in the menu in the header of the details.
const chooseAction = async (page: Page, details: ReturnType<Page["getByRole"]>, name: string) => {
  await details.getByRole("button", { name: "Ações sobre o usuário" }).click()
  await page.getByRole("menuitem", { name }).click()
}

const openActions = async (page: Page, details: ReturnType<Page["getByRole"]>) => {
  await details.getByRole("button", { name: "Ações sobre o usuário" }).click()
  return page.getByRole("menu", { name: "Ações sobre o usuário" })
}

const pick = async (page: Page, scope: ReturnType<Page["getByRole"]>, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("changing access", () => {
  test("compares before and after, and asks to confirm a reduction", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Alterar acesso")
    const dialog = page.getByRole("dialog", { name: "Alterar acesso de Maria Souza" })

    await dialog.getByRole("button", { name: "Remover Professor · Unidade Caucaia" }).click()
    await expect(dialog.getByText("Professor · Unidade Caucaia (será removido)")).toBeVisible()
    await dialog.getByRole("button", { name: "Adicionar papel" }).click()
    const row = dialog.getByRole("group", { name: "Papel 1" })
    await pick(page, row, /^Papel/, "Coordenação")
    await pick(page, row, /^Unidade/, "Unidade Aldeota")

    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog.getByRole("region", { name: "Será adicionado" })).toContainText("Coordenação · Unidade Aldeota")
    await expect(dialog.getByRole("region", { name: "Será removido" })).toContainText("Professor · Unidade Caucaia")
    await expect(dialog.getByRole("region", { name: "Continua" })).toContainText("Secretaria · Unidade Aldeota")
    const reach = dialog.getByRole("region", { name: "O que muda no alcance" })
    await expect(reach).toContainText("Deixa de acessar Unidade Caucaia.")
    await expect(reach).toContainText("Passa a ser Coordenação.")
    await expect(dialog).toContainText("as sessões abertas de Maria Souza são encerradas")

    // A reduction needs an explicit confirmation.
    const confirm = dialog.getByRole("button", { name: "Confirmar alteração" })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole("checkbox", { name: "Confirmo a redução do acesso desta pessoa." }).check()
    await confirm.click()

    await expect(page.getByText("Acesso de Maria Souza atualizado. 2 sessões abertas foram encerradas.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/users/2/assignments")?.body).toEqual({
      assignments: [
        { roleCode: "SECRETARIA", schoolUnitId: 1 },
        { roleCode: "COORDENACAO", schoolUnitId: 1 },
      ],
      version: 0,
    })
    // The details open again, read again.
    const reopened = page.getByRole("dialog", { name: "Detalhes do usuário" })
    await expect(reopened.getByRole("region", { name: "Papéis e unidades" })).toContainText(
      "Coordenação · Unidade Aldeota",
    )
  })

  test("keeps at least one role, and warns when Admin is granted", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Alterar acesso")
    const dialog = page.getByRole("dialog", { name: "Alterar acesso de Maria Souza" })

    await dialog.getByRole("button", { name: "Remover Secretaria · Unidade Aldeota" }).click()
    await dialog.getByRole("button", { name: "Remover Professor · Unidade Caucaia" }).click()
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await expect(dialog.getByRole("alert")).toContainText("Mantenha ao menos um papel")

    await dialog.getByRole("button", { name: "Manter Secretaria · Unidade Aldeota" }).click()
    await dialog.getByRole("button", { name: "Manter Professor · Unidade Caucaia" }).click()
    await dialog.getByRole("button", { name: "Adicionar papel" }).click()
    await pick(page, dialog.getByRole("group", { name: "Papel 1" }), /^Papel/, "Administrador")
    await dialog.getByRole("button", { name: "Revisar" }).click()

    await expect(dialog.getByRole("region", { name: "O que muda no alcance" })).toContainText(
      "Administrador alcança toda a instituição",
    )
    // Nothing is reduced: no confirmation needed.
    await expect(dialog.getByRole("checkbox")).toHaveCount(0)
    await expect(dialog.getByRole("button", { name: "Confirmar alteração" })).toBeEnabled()
  })

  test("reads the user again when someone else changed it meanwhile", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page, {
      userActionFailure: { action: "assignments", code: "VERSION_CONFLICT", status: 409 },
    })
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Alterar acesso")
    const dialog = page.getByRole("dialog", { name: "Alterar acesso de Maria Souza" })
    await dialog.getByRole("button", { name: "Adicionar papel" }).click()
    const row = dialog.getByRole("group", { name: "Papel 1" })
    await pick(page, row, /^Papel/, "Financeiro")
    await pick(page, row, /^Unidade/, "Unidade Caucaia")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Confirmar alteração" }).click()

    await expect(dialog.getByRole("alert")).toContainText("Outra pessoa alterou este usuário")
    // The role being added stays; saving again goes with the version read again.
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Confirmar alteração" }).click()
    await expect(page.getByText(/Acesso de Maria Souza atualizado/)).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/users/2/assignments")?.body).toMatchObject({ version: 1 })
  })
})

test.describe("revoking access", () => {
  test("revokes one role, saying what goes and what stays", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Revogar acesso")
    const dialog = page.getByRole("dialog", { name: "Revogar acesso de Maria Souza" })

    await expect(dialog.getByRole("button", { name: "Revisar" })).toBeDisabled()
    await dialog.getByRole("checkbox", { name: "Professor · Unidade Caucaia" }).check()
    await dialog.getByRole("button", { name: "Revisar" }).click()

    await expect(dialog.getByRole("region", { name: "Será removido" })).toContainText("Professor · Unidade Caucaia")
    await expect(dialog.getByRole("region", { name: "Continua" })).toContainText("Secretaria · Unidade Aldeota")
    await expect(dialog).toContainText("Os outros papéis de Maria Souza continuam.")
    const revoke = dialog.getByRole("button", { name: "Revogar acesso" })
    await expect(revoke).toBeDisabled()
    await dialog.getByRole("checkbox", { name: /^Confirmo a revogação/ }).check()
    await revoke.click()

    await expect(page.getByText("Acesso revogado. 2 sessões abertas de Maria Souza foram encerradas.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/users/2/revoke")?.body).toEqual({ assignmentIds: [3], confirm: true })
  })

  test("says that revoking every role leaves the person unable to sign in, without deleting the account", async ({
    page,
  }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Revogar acesso")
    const dialog = page.getByRole("dialog", { name: "Revogar acesso de Maria Souza" })
    await dialog.getByRole("checkbox", { name: "Secretaria · Unidade Aldeota" }).check()
    await dialog.getByRole("checkbox", { name: "Professor · Unidade Caucaia" }).check()
    await dialog.getByRole("button", { name: "Revisar" }).click()

    await expect(dialog).toContainText("Maria Souza fica sem nenhum papel e não consegue mais entrar.")
    await expect(dialog).toContainText("A conta não é inativada nem apagada")
  })
})

test.describe("account status", () => {
  test("inactivates an account and reactivates it", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    let details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Inativar conta")
    const confirm = page.getByRole("dialog", { name: "Inativar a conta de Maria Souza?" })
    await expect(confirm).toContainText("a conta pode ser reativada depois")
    await confirm.getByRole("button", { name: "Inativar conta" }).click()

    await expect(page.getByText("Conta de Maria Souza inativada.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/users/2/inactivate")).toBeTruthy()
    details = page.getByRole("dialog", { name: "Detalhes do usuário" })
    await expect(details).toContainText("Inativo")

    await chooseAction(page, details, "Reativar conta")
    await page
      .getByRole("dialog", { name: "Reativar a conta de Maria Souza?" })
      .getByRole("button", {
        name: "Reativar conta",
      })
      .click()
    await expect(page.getByText("Conta de Maria Souza reativada.")).toBeVisible()
  })

  test("explains why the last Admin can't be inactivated", async ({ page }) => {
    await mockUserAccessApi(page, { userActionFailure: { action: "inactivate", code: "LAST_ADMIN", status: 409 } })
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Inativar conta")
    const confirm = page.getByRole("dialog", { name: "Inativar a conta de Maria Souza?" })
    await confirm.getByRole("button", { name: "Inativar conta" }).click()

    await expect(confirm.getByRole("alert")).toContainText("última conta de Administrador ativa")
  })
})

test.describe("temporary password", () => {
  test("generates one after confirming and shows it once, with the way to sign in", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    await mockUserAccessApi(page)
    const issued: string[] = []
    await page.route(/\/api\/users\/\d+\/temporary-password$/, (route) => {
      issued.push(new URL(route.request().url()).pathname)
      return route.fulfill(apiAnswer({ expiresAt: "2026-11-29T15:00:00Z", temporaryPassword: "Kx7mPq2Rt9Wz4N" }))
    })
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Gerar senha temporária")
    const confirm = page.getByRole("dialog", { name: "Gerar senha temporária para Maria Souza?" })
    await expect(confirm).toContainText("aparece uma única vez e vale por 7 dias")
    await confirm.getByRole("button", { name: "Gerar senha" }).click()

    const shown = page.getByRole("dialog", { name: "Senha temporária de Maria Souza" })
    await expect(shown.getByRole("textbox", { name: "Senha temporária" })).toHaveValue("Kx7mPq2Rt9Wz4N")
    await expect(shown).toContainText("Esta é a única vez que a senha aparece")
    await expect(shown).toContainText("maria.souza@horizonte.edu.br")
    expect(issued).toEqual(["/api/users/2/temporary-password"])

    await shown.getByRole("button", { name: "Copiar senha" }).click()
    await expect(page.getByText("Senha copiada.")).toBeVisible()

    // Done goes back to the details; the password is gone for good.
    await shown.getByRole("button", { name: "Concluir" }).click()
    await expect(page.getByRole("dialog", { name: "Detalhes do usuário" })).toBeVisible()
    await expect(page.getByText("Kx7mPq2Rt9Wz4N")).toHaveCount(0)
  })

  test("is not offered on the own account", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "João Silva")
    const menu = await openActions(page, details)
    await expect(menu.getByRole("menuitem", { name: "Gerar senha temporária" })).toHaveCount(0)
  })
})

test.describe("profile and own account", () => {
  test("closes the actions menu on Escape without closing the details", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    const menu = await openActions(page, details)
    await expect(menu.getByRole("menuitem", { name: "Alterar acesso" })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(menu).toHaveCount(0)
    await expect(details).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(details).toHaveCount(0)
  })

  test("edits a user's name and phone", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "Maria Souza")
    await chooseAction(page, details, "Editar dados")
    const dialog = page.getByRole("dialog", { name: "Editar dados de Maria Souza" })

    await dialog.getByRole("textbox", { name: /^Nome completo/ }).fill("")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(dialog.getByText("Informe o nome completo.")).toBeVisible()

    await dialog.getByRole("textbox", { name: /^Nome completo/ }).fill("Maria Silva Souza")
    await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Dados de Maria Silva Souza atualizados.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/users/2/profile")?.body).toEqual({
      fullName: "Maria Silva Souza",
      phone: "",
      version: 0,
    })
  })

  test("offers only the name and phone on the own account", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, "João Silva")
    const menu = await openActions(page, details)
    await expect(menu.getByRole("menuitem")).toHaveText(["Editar dados"])
    await expect(details).toContainText("Esta é a sua conta")
  })

  test("offers no action the backend doesn't allow on the user", async ({ page }) => {
    await mockUserAccessApi(page)
    await page.route(/\/api\/users\/3$/, (route) => route.fulfill(apiAnswer({ ...users[2], eligibleActions: [] })))
    await signInAndOpen(page, usersPath)

    const details = await openDetails(page, users[2].fullName as string)
    await expect(details).toContainText(users[2].email as string)
    await expect(details.getByRole("button", { name: "Ações sobre o usuário" })).toHaveCount(0)
  })

  test("keeps a Secretaria away from the access outside its reach", async ({ page }) => {
    const shared = {
      ...users[2],
      assignments: [
        { ...(users[2].assignments[0] as object), assignmentId: 70, unitId: 1, unitName: "Unidade Aldeota" },
        { ...(users[2].assignments[0] as object), assignmentId: 71, unitId: 2, unitName: "Unidade Caucaia" },
      ],
      email: "rui@horizonte.edu.br",
      enabled: true,
      fullName: "Rui Lopes",
      id: 7,
      status: "ACTIVE",
    }
    await mockUserAccessApi(page, { units: [units[0]], users: [shared] })
    await signInAndOpen(page, usersPath, secretariaContext)

    const details = await openDetails(page, "Rui Lopes")
    await chooseAction(page, details, "Alterar acesso")
    const dialog = page.getByRole("dialog", { name: "Alterar acesso de Rui Lopes" })
    await expect(dialog.getByRole("button", { name: "Remover Professor · Unidade Aldeota" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Remover Professor · / })).toHaveCount(1)
    await expect(dialog.getByText("Fora do seu alcance: só a Administração altera.")).toBeVisible()
  })
})
