import { awaitingInvitation, mockPeopleApi, students } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The student-guardian links and the guardian invitations of the P03 (phase 5), all from the student's
// Responsáveis tab: linking a registered guardian (in reach, or of another unit through the exact check)
// with the consent, changing and ending a link, and inviting a guardian by e-mail, whom the school then
// confirms or rejects. The backend is mocked (e2e/support/people.ts) and keeps what is saved; the
// signed-in user is an Admin unless the spec says otherwise.

const studentsPath = "/administration/students"

// Today as the screen fills it in: the local date of the browser (the same machine and time zone as
// this test), not the UTC one, which is already tomorrow late in the evening in Brazil.
const today = () => new Date().toLocaleDateString("en-CA")

const openGuardians = async (page: Page, studentId: number) => {
  await page.goto(`${studentsPath}/${studentId}`)
  await page.getByRole("tab", { name: "Responsáveis" }).click()
}

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const linkRow = (page: Page, name: string) =>
  page.getByRole("region", { name: "Responsáveis vinculados" }).getByRole("row").filter({ hasText: name })

const chooseLinkAction = async (page: Page, name: string, action: string) => {
  await page.getByRole("button", { name: `Ações do vínculo com ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

test.describe("new link", () => {
  test("links a guardian in reach, asking for the consent first", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Vincular responsável" }).click()
    const dialog = page.getByRole("dialog", { name: "Vincular responsável a Carla Dias" })
    await dialog.getByRole("searchbox", { name: /^Responsável/ }).fill("Gustavo")
    await dialog.getByRole("button", { name: "Escolher Gustavo Lima" }).click()
    await expect(dialog.getByRole("group", { name: "Responsável" })).toContainText("Gustavo Lima")

    await pick(page, /^Parentesco/, "Pai")
    await dialog.getByRole("switch", { name: "Responsável financeiro" }).check()
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click()
    await expect(dialog.getByRole("checkbox", { name: /consentiu/ })).toHaveAccessibleDescription(
      "Confirme o consentimento do responsável para vincular.",
    )

    await dialog.getByRole("checkbox", { name: /consentiu/ }).check()
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click()

    await expect(page.getByText("Gustavo Lima vinculado ao aluno.")).toBeVisible()
    await expect(linkRow(page, "Gustavo Lima")).toContainText("Pai")
    await expect(linkRow(page, "Gustavo Lima")).toContainText("Financeiro")
    expect(lastCall(calls, "POST", "/api/student-guardian-links")?.body).toEqual({
      consentConfirmed: true,
      contactAuthorized: true,
      financialResponsible: true,
      guardianId: 302,
      pedagogicalResponsible: true,
      relationshipCode: "FATHER",
      startDate: today(),
      studentId: 203,
    })
  })

  test("links a guardian of another unit through the exact check", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Vincular responsável" }).click()
    const dialog = page.getByRole("dialog", { name: "Vincular responsável a Carla Dias" })
    await dialog.getByRole("button", { name: "Não encontrou? Conferir em todas as unidades" }).click()
    await dialog.getByRole("textbox", { name: "E-mail" }).fill("antonio@escola.com")
    await dialog.getByRole("button", { exact: true, name: "Conferir em todas as unidades" }).click()

    const found = dialog.getByRole("list", { name: "Pessoas encontradas na conferência" })
    await expect(found).toContainText("Antônio R.")
    await expect(found).toContainText("De outra unidade")
    await found.getByRole("button", { name: "Escolher Antônio R." }).click()

    await pick(page, /^Parentesco/, "Outro")
    await dialog.getByRole("checkbox", { name: /consentiu/ }).check()
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click()

    await expect(linkRow(page, "Antônio Ribeiro")).toContainText("Outro")
    const body = lastCall(calls, "POST", "/api/student-guardian-links")?.body as Record<string, unknown>
    expect(body).toMatchObject({ relationshipCode: "OTHER", reuseRef: "ref-390", studentId: 203 })
    expect(body.guardianId).toBeUndefined()
  })

  test("doesn't let a guardian already linked or inactive be chosen", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/201`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Vincular responsável" }).click()
    const dialog = page.getByRole("dialog", { name: "Vincular responsável a Ana Beatriz Souza" })
    const search = dialog.getByRole("searchbox", { name: /^Responsável/ })
    const results = dialog.getByRole("list", { name: "Responsáveis encontrados" })

    await search.fill("Fernanda")
    await expect(results).toContainText("Já vinculado a este aluno.")
    await expect(results.getByRole("button", { name: /^Escolher/ })).toHaveCount(0)

    await search.fill("Helena")
    await expect(results).toContainText("Responsável inativo.")
    await expect(results.getByRole("button", { name: /^Escolher/ })).toHaveCount(0)

    await search.fill("Ninguém Aqui")
    await expect(dialog.getByText("Nenhum responsável encontrado nas suas unidades.")).toBeVisible()
  })

  test("is not offered for an inactive student", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/204`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await expect(page.getByRole("region", { name: "Responsáveis vinculados" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Vincular responsável" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Convidar por e-mail" })).toHaveCount(0)
  })
})

test.describe("link changes", () => {
  test("changes a link, keeping what was typed when someone else changed it first", async ({ page }) => {
    const { calls } = await mockPeopleApi(page, { changedLinkId: 2010 })
    await signInAndOpen(page, `${studentsPath}/201`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await chooseLinkAction(page, "Fernanda Souza", "Editar vínculo")
    const dialog = page.getByRole("dialog", { name: "Editar vínculo com Fernanda Souza" })
    await dialog.getByRole("switch", { name: "Responsável financeiro" }).uncheck()
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(dialog.getByRole("alert")).toContainText("Outra pessoa alterou este vínculo")
    await expect(dialog.getByRole("note", { name: "Versão atual do vínculo" })).toContainText("Parentesco: Avó")
    await expect(dialog.getByRole("switch", { name: "Responsável financeiro" })).not.toBeChecked()

    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Vínculo com Fernanda Souza atualizado.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/student-guardian-links/2010")?.body).toEqual({
      contactAuthorized: true,
      financialResponsible: false,
      pedagogicalResponsible: true,
      relationshipCode: "MOTHER",
      startDate: "2026-02-01",
      version: 1,
    })
    await expect(linkRow(page, "Fernanda Souza")).not.toContainText("Financeiro")
  })

  test("ends a link with a reason, keeping it as history", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/201`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await chooseLinkAction(page, "Gustavo Lima", "Encerrar vínculo")
    const dialog = page.getByRole("dialog", { name: "Encerrar vínculo com Gustavo Lima?" })
    await expect(dialog).toContainText("O vínculo fica no histórico e não é apagado.")
    await dialog.getByRole("button", { name: "Encerrar vínculo" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Motivo do encerramento/ })).toHaveAccessibleDescription(
      "Informe o motivo do encerramento.",
    )

    await dialog.getByRole("textbox", { name: /^Motivo do encerramento/ }).fill("Mudança de guarda")
    await dialog.getByRole("button", { name: "Encerrar vínculo" }).click()

    await expect(page.getByText("Vínculo com Gustavo Lima encerrado.")).toBeVisible()
    await expect(linkRow(page, "Gustavo Lima")).toContainText("Encerrado")
    await expect(page.getByRole("button", { name: "Ações do vínculo com Gustavo Lima" })).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/student-guardian-links/2011/end")?.body).toEqual({
      reason: "Mudança de guarda",
      version: 0,
    })
  })

  test("keeps the last guardian of an active student under 18, even from the Admin", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/202`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await chooseLinkAction(page, "Fernanda Souza", "Encerrar vínculo")
    const dialog = page.getByRole("dialog", { name: "Encerrar vínculo com Fernanda Souza?" })
    await expect(dialog.getByRole("note")).toContainText(
      "É o único responsável de um aluno ativo menor de 18 anos. Vincule outro responsável antes de encerrar este.",
    )
    await expect(dialog.getByRole("button", { name: "Encerrar vínculo" })).toBeDisabled()
    await expect(dialog.getByRole("textbox", { name: /^Motivo da exceção/ })).toHaveCount(0)
  })

  test("ends the last guardian of an adult student", async ({ page }) => {
    const adult = students.map((item) => (item.id === 202 ? { ...item, birthDate: "2001-02-03" } : item))
    const { calls } = await mockPeopleApi(page, { students: adult })
    await signInAndOpen(page, `${studentsPath}/202`, secretariaContext)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await chooseLinkAction(page, "Fernanda Souza", "Encerrar vínculo")
    const dialog = page.getByRole("dialog", { name: "Encerrar vínculo com Fernanda Souza?" })
    await expect(dialog.getByRole("note")).toHaveCount(0)
    await dialog.getByRole("textbox", { name: /^Motivo do encerramento/ }).fill("Aluno passou a morar sozinho")
    await dialog.getByRole("button", { name: "Encerrar vínculo" }).click()

    await expect(page.getByText("Vínculo com Fernanda Souza encerrado.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/student-guardian-links/2020/end")?.body).toEqual({
      reason: "Aluno passou a morar sozinho",
      version: 0,
    })
  })
})

test.describe("guardian invitation", () => {
  test("invites a guardian by e-mail, the link waiting for the acceptance", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Convidar por e-mail" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar responsável de Carla Dias" })
    await dialog.getByRole("textbox", { name: /^E-mail do responsável/ }).fill("paula@gmail.com")
    await dialog.getByRole("textbox", { name: /^Nome do responsável/ }).fill("Paula Mendes")
    await pick(page, /^Parentesco/, "Mãe")
    await dialog.getByRole("button", { name: "Enviar convite" }).click()

    await expect(page.getByText("Convite enviado para paula@gmail.com.")).toBeVisible()
    const invitations = page.getByRole("region", { name: "Convites de responsáveis" })
    await expect(invitations.getByRole("row").filter({ hasText: "paula@gmail.com" })).toContainText("Aguardando aceite")
    await expect(linkRow(page, "Paula Mendes")).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/students/203/guardian-invitations")?.body).toEqual({
      contactAuthorized: true,
      email: "paula@gmail.com",
      financialResponsible: false,
      fullName: "Paula Mendes",
      pedagogicalResponsible: true,
      relationshipCode: "MOTHER",
    })
  })

  test("points out an e-mail that already has an account", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Convidar por e-mail" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar responsável de Carla Dias" })
    await dialog.getByRole("textbox", { name: /^E-mail do responsável/ }).fill("fernanda@gmail.com")
    await pick(page, /^Parentesco/, "Mãe")
    await dialog.getByRole("button", { name: "Enviar convite" }).click()

    await expect(dialog.getByRole("textbox", { name: /^E-mail do responsável/ })).toHaveAccessibleDescription(
      "Esse e-mail já tem uma conta. Vincule o responsável direto.",
    )
  })

  test("confirms a guardian who accepted, which makes the link", async ({ page }) => {
    await mockPeopleApi(page, { invitations: [awaitingInvitation] })
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    const invitations = page.getByRole("region", { name: "Convites de responsáveis" })
    await expect(invitations.getByRole("row").filter({ hasText: "Gustavo Lima" })).toContainText(
      "Aguardando a escola confirmar",
    )
    await page.getByRole("button", { name: "Ações do vínculo com Gustavo Lima" }).click()
    await page.getByRole("menuitem", { name: "Confirmar responsável" }).click()
    const dialog = page.getByRole("dialog", { name: "Confirmar Gustavo Lima como responsável?" })
    await dialog.getByRole("button", { name: "Confirmar" }).click()

    await expect(page.getByText("Gustavo Lima confirmado e vinculado.")).toBeVisible()
    await expect(linkRow(page, "Gustavo Lima")).toContainText("Pai")
    await expect(invitations.getByRole("row").filter({ hasText: "Gustavo Lima" })).toContainText("Confirmado")

    // Read again, the link is there, active.
    await openGuardians(page, 203)
    await expect(linkRow(page, "Gustavo Lima")).toContainText("Ativo")
  })

  test("rejects the wrong person, without a link", async ({ page }) => {
    const { calls } = await mockPeopleApi(page, { invitations: [awaitingInvitation] })
    await signInAndOpen(page, `${studentsPath}/203`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Ações do vínculo com Gustavo Lima" }).click()
    await page.getByRole("menuitem", { name: "Recusar" }).click()
    await page.getByRole("dialog", { name: "Recusar Gustavo Lima?" }).getByRole("button", { name: "Recusar" }).click()

    await expect(page.getByText("Convite de Gustavo Lima recusado.")).toBeVisible()
    const invitations = page.getByRole("region", { name: "Convites de responsáveis" })
    await expect(invitations.getByRole("row").filter({ hasText: "Gustavo Lima" })).toContainText("Recusado")
    await expect(linkRow(page, "Gustavo Lima")).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/students/203/guardian-invitations/61/reject")).toBeDefined()
  })
})
