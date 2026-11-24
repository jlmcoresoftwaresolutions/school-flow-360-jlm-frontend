import { mockPeopleApi } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The student registration and 360 profile of the P03 (phase 3): a new student saved as a draft, the
// duplicate review, the edition, the status changes and the student's access. The backend is mocked
// (e2e/support/people.ts) and keeps what is saved; the signed-in user is an Admin unless a test says
// otherwise.

const studentsPath = "/administration/students"

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const fillNewStudent = async (page: Page, name: string) => {
  await page.getByRole("textbox", { name: /^Nome completo/ }).fill(name)
  await pick(page, /^Unidade de referência/, "Unidade Aldeota")
}

const chooseAction = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Ações do aluno" }).click()
  await page.getByRole("menuitem", { name }).click()
}

test.describe("new student", () => {
  test("saves a draft and opens its profile, without creating an access", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath)

    await page.getByRole("button", { name: "Novo aluno" }).click()
    await expect(page).toHaveURL(/\/administration\/students\/new$/)
    await expect(page.getByRole("heading", { level: 1, name: "Novo aluno" })).toBeVisible()

    await fillNewStudent(page, "Lia Martins")
    await page.getByRole("textbox", { name: /^E-mail de contato/ }).fill("lia@familia.com.br")
    await page.getByRole("button", { name: "Salvar rascunho" }).click()

    await expect(page).toHaveURL(/\/administration\/students\/250$/)
    await expect(page.getByText("Aluno cadastrado como rascunho.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Lia Martins" })).toBeVisible()
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible()
    await expect(page.getByText("Para ativar, falta: um responsável vinculado.")).toBeVisible()

    expect(lastCall(calls, "POST", "/api/students")?.body).toEqual({
      contactEmail: "lia@familia.com.br",
      fullName: "Lia Martins",
      referenceUnitId: 1,
    })
  })

  test("points out each problem on its field, the backend's too", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/new`)

    await page.getByRole("button", { name: "Salvar rascunho" }).click()
    await expect(page.getByRole("textbox", { name: /^Nome completo/ })).toHaveAccessibleDescription(
      "Informe o nome completo.",
    )
    await expect(page.getByRole("combobox", { name: /^Unidade de referência/ })).toHaveAccessibleDescription(
      /Escolha a unidade de referência./,
    )

    await fillNewStudent(page, "Ana Souza")
    await page.getByRole("textbox", { name: /^Apelido/ }).fill("ana souza")
    await page.getByRole("button", { name: "Salvar rascunho" }).click()
    await expect(page.getByRole("textbox", { name: /^Apelido/ })).toHaveAccessibleDescription(/Use de 3 a 60 letras/)

    await page.getByRole("textbox", { name: /^Apelido/ }).fill("ana.souza482")
    await page.getByRole("button", { name: "Salvar rascunho" }).click()
    await expect(page.getByRole("textbox", { name: /^Apelido/ })).toHaveAccessibleDescription(
      "Esse apelido já está em uso. Escolha outro.",
    )
    await expect(page).toHaveURL(/\/new$/)
  })

  test("reviews a possible duplicate and keeps the new student apart with a justification", async ({ page }) => {
    const { calls } = await mockPeopleApi(page, { duplicateEmail: "familia@gmail.com" })
    await signInAndOpen(page, `${studentsPath}/new`)

    await fillNewStudent(page, "Ana Beatriz")
    await page.getByRole("textbox", { name: /^E-mail de contato/ }).fill("familia@gmail.com")
    await page.getByRole("button", { name: "Salvar rascunho" }).click()

    const review = page.getByRole("dialog", { name: "Possível cadastro repetido" })
    await expect(review).toContainText("Ana Beatriz Souza")
    await expect(review).toContainText("E-mail igual")
    // Someone out of reach: only a partial name, never opened.
    await expect(review).toContainText("Antônio R.")
    await expect(review).toContainText("fora do seu alcance")
    expect(lastCall(calls, "POST", "/api/people/duplicate-reviews")?.body).toEqual({
      kind: "STUDENT",
      signals: { email: "familia@gmail.com", fullName: "Ana Beatriz" },
    })

    await review.getByRole("button", { name: "Manter separado e salvar" }).click()
    await expect(review.getByRole("textbox", { name: /^Justificativa/ })).toHaveAccessibleDescription(
      "Escreva uma justificativa com pelo menos 10 caracteres.",
    )

    await review.getByRole("textbox", { name: /^Justificativa/ }).fill("Irmãs com o mesmo e-mail da família")
    await review.getByRole("button", { name: "Manter separado e salvar" }).click()

    await expect(page).toHaveURL(/\/administration\/students\/250$/)
    expect(lastCall(calls, "POST", "/api/students")?.body).toMatchObject({ duplicateReviewId: 41 })
  })

  test("opens the existing student instead of registering it again", async ({ page }) => {
    const { calls } = await mockPeopleApi(page, { duplicateEmail: "familia@gmail.com" })
    await signInAndOpen(page, `${studentsPath}/new`)

    await fillNewStudent(page, "Ana Beatriz")
    await page.getByRole("textbox", { name: /^E-mail de contato/ }).fill("familia@gmail.com")
    await page.getByRole("button", { name: "Salvar rascunho" }).click()
    await page
      .getByRole("dialog", { name: "Possível cadastro repetido" })
      .getByRole("button", { name: "Abrir este cadastro" })
      .click()

    await expect(page).toHaveURL(/\/administration\/students\/201$/)
    await expect(page.getByRole("heading", { level: 1, name: "Ana Beatriz Souza" })).toBeVisible()
    expect(lastCall(calls, "POST", /\/decision$/)?.body).toMatchObject({ candidateRef: "ref-201", decision: "REUSE" })
  })
})

test.describe("student profile", () => {
  test("shows the data and the guardians with their links", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/201`)

    await expect(page.getByRole("heading", { level: 1, name: "Ana Beatriz Souza" })).toBeVisible()
    await expect(page.getByText("ALU-000001 · Unidade Aldeota")).toBeVisible()
    await expect(page.getByRole("region", { name: "Identificação" })).toContainText("Sem acesso")

    await page.getByRole("tab", { name: "Responsáveis" }).click()
    const guardians = page.getByRole("region", { name: "Responsáveis vinculados" })
    await expect(guardians.getByRole("row").filter({ hasText: "Fernanda Souza" })).toContainText("Mãe")
    await expect(guardians.getByRole("row").filter({ hasText: "Fernanda Souza" })).toContainText("Financeiro")
    await expect(guardians.getByRole("row").filter({ hasText: "Gustavo Lima" })).toContainText("Desde 01/02/2026")
  })

  test("opens from the list and says when the student isn't in reach", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath)

    await page.getByRole("button", { name: "Ações de Bruno Lima" }).click()
    await page.getByRole("menuitem", { name: "Ver perfil" }).click()
    await expect(page).toHaveURL(/\/administration\/students\/202$/)

    await page.goto(`${studentsPath}/999`)
    await expect(page.getByText("Aluno não encontrado")).toBeVisible()
  })

  test("edits the data and goes back to the profile", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/202`)

    await chooseAction(page, "Editar dados")
    await expect(page.getByRole("heading", { level: 1, name: "Editar aluno" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: /^Nome completo/ })).toHaveValue("Bruno Lima")
    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Bruno Lima Neto")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()

    await expect(page).toHaveURL(/\/administration\/students\/202$/)
    await expect(page.getByText("Dados do aluno atualizados.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Bruno Lima Neto" })).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/students/202")?.body).toMatchObject({ fullName: "Bruno Lima Neto", version: 0 })
    // The nickname wasn't touched: it isn't sent, and the backend keeps it.
    expect(lastCall(calls, "PUT", "/api/students/202")?.body).not.toHaveProperty("nickname")
  })

  test("changes the nickname the student signs in with", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/202/edit`)

    const nickname = page.getByRole("textbox", { name: /^Apelido/ })
    await expect(nickname).toHaveValue("bruno.202")
    await expect(nickname).toHaveAccessibleDescription(/trocar o apelido encerra as sessões abertas/)

    await nickname.fill("")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(nickname).toHaveAccessibleDescription("Informe o apelido.")

    await nickname.fill("ana.souza482")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(nickname).toHaveAccessibleDescription("Esse apelido já está em uso. Escolha outro.")

    await nickname.fill("Bruno.Lima")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page).toHaveURL(/\/administration\/students\/202$/)
    expect(lastCall(calls, "PUT", "/api/students/202")?.body).toMatchObject({ nickname: "bruno.lima" })
  })

  test("lets only the Admin activate a student without a guardian, giving the reason", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`)

    await chooseAction(page, "Ativar aluno")
    const confirm = page.getByRole("dialog", { name: "Ativar Carla Dias?" })
    await confirm.getByRole("button", { name: "Ativar sem responsável" }).click()
    await expect(confirm.getByRole("textbox", { name: /^Motivo da exceção/ })).toHaveAccessibleDescription(
      "Escreva o motivo com 10 a 500 caracteres.",
    )

    await confirm.getByRole("textbox", { name: /^Motivo da exceção/ }).fill("Aluna adulta da EJA, sem responsável")
    await confirm.getByRole("button", { name: "Ativar sem responsável" }).click()

    await expect(page.getByText("Aluno ativado.")).toBeVisible()
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible()
    expect(lastCall(calls, "POST", "/api/students/203/activate")?.body).toEqual({
      exceptionReason: "Aluna adulta da EJA, sem responsável",
      version: 0,
    })
  })

  test("keeps the activation closed to a Secretaria while the guardian is missing", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/203`, secretariaContext)

    await chooseAction(page, "Ativar aluno")
    const confirm = page.getByRole("dialog", { name: "Ativar Carla Dias?" })
    await expect(confirm).toContainText("Vincule um responsável antes de ativar.")
    await expect(confirm.getByRole("button", { name: "Ativar", exact: true })).toBeDisabled()
  })

  test("inactivates and reactivates an active student", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/202`)

    await chooseAction(page, "Inativar aluno")
    await page.getByRole("dialog", { name: "Inativar Bruno Lima?" }).getByRole("button", { name: "Inativar" }).click()
    await expect(page.getByText("Aluno inativado.")).toBeVisible()
    await expect(page.getByText("Inativo", { exact: true })).toBeVisible()

    await chooseAction(page, "Reativar aluno")
    await page.getByRole("dialog", { name: "Reativar Bruno Lima?" }).getByRole("button", { name: "Reativar" }).click()
    await expect(page.getByText("Aluno reativado.")).toBeVisible()
  })

  test("gives an active student an access with a temporary password", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${studentsPath}/201`)

    await chooseAction(page, "Criar acesso do aluno")
    await page
      .getByRole("dialog", { name: "Gerar senha temporária para Ana Beatriz Souza?" })
      .getByRole("button", { name: "Gerar senha" })
      .click()

    const shown = page.getByRole("dialog", { name: "Senha temporária de Ana Beatriz Souza" })
    await expect(shown.getByRole("textbox", { name: "Senha temporária" })).toHaveValue("Kx7mPq2Rt9Wz4N")
    await expect(shown).toContainText("entra com o apelido ana.201")
    expect(lastCall(calls, "POST", "/api/users/201/temporary-password")).toBeDefined()
  })
})
