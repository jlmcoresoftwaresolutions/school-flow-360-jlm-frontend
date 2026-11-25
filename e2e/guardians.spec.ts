import { mockPeopleApi } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, signInAndOpen } from "./support/userAccess.ts"

// The guardian registration and detail of the P03 (phase 4): a new guardian, the edition, the status
// changes and the students it is linked to. The backend is mocked (e2e/support/people.ts) and keeps what
// is saved; the signed-in user is an Admin.

const guardiansPath = "/administration/guardians"

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const chooseAction = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Ações do responsável" }).click()
  await page.getByRole("menuitem", { name }).click()
}

test.describe("new guardian", () => {
  test("registers an active guardian in a unit, without an access or a link", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, guardiansPath)

    await page.getByRole("button", { name: "Novo responsável" }).click()
    await expect(page).toHaveURL(/\/administration\/guardians\/new$/)

    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Paula Mendes")
    await pick(page, /^Unidade/, "Unidade Caucaia")
    await page.getByRole("textbox", { name: /^Telefone/ }).fill("85988887777")
    await page.getByRole("button", { name: "Cadastrar responsável" }).click()

    await expect(page).toHaveURL(/\/administration\/guardians\/350$/)
    await expect(page.getByText("Responsável cadastrado.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Paula Mendes" })).toBeVisible()
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible()
    expect(lastCall(calls, "POST", "/api/guardians")?.body).toEqual({
      fullName: "Paula Mendes",
      phone: "+55 85 98888 7777",
      unitId: 2,
    })
  })

  test("points out a document that already belongs to someone", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/new`)

    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Paula Mendes")
    await pick(page, /^Unidade/, "Unidade Aldeota")
    await pick(page, /^Tipo de documento/, "CPF")
    await page.getByRole("textbox", { name: /^Número do documento/ }).fill("11144477735")
    // The CPF takes its mask as it is typed.
    await expect(page.getByRole("textbox", { name: /^Número do documento/ })).toHaveValue("111.444.777-35")
    await page.getByRole("button", { name: "Cadastrar responsável" }).click()

    await expect(page.getByRole("textbox", { name: /^Número do documento/ })).toHaveAccessibleDescription(
      "Esse documento já pertence a outra pessoa. Use o cadastro existente ou corrija o documento.",
    )
    await expect(page).toHaveURL(/\/new$/)
  })

  test("refuses a CPF whose check digits don't match, before sending it", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/new`)

    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Paula Mendes")
    await pick(page, /^Unidade/, "Unidade Aldeota")
    await page.getByRole("textbox", { name: /^Número do documento/ }).fill("11122233344")
    // Choosing CPF after typing masks what was typed.
    await pick(page, /^Tipo de documento/, "CPF")
    await expect(page.getByRole("textbox", { name: /^Número do documento/ })).toHaveValue("111.222.333-44")
    await page.getByRole("button", { name: "Cadastrar responsável" }).click()

    await expect(page.getByRole("textbox", { name: /^Número do documento/ })).toHaveAccessibleDescription(
      "CPF inválido: confira os 11 dígitos.",
    )
    expect(lastCall(calls, "POST", "/api/guardians")).toBeUndefined()
  })

  test("asks for the document number once its type is chosen", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/new`)

    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Paula Mendes")
    await pick(page, /^Unidade/, "Unidade Aldeota")
    await pick(page, /^Tipo de documento/, "RG")
    await page.getByRole("button", { name: "Cadastrar responsável" }).click()

    await expect(page.getByRole("textbox", { name: /^Número do documento/ })).toHaveAccessibleDescription(
      "Informe o número do documento.",
    )
  })
})

test.describe("guardian profile", () => {
  test("shows the data and the students it is linked to", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/302`)

    await expect(page.getByRole("heading", { level: 1, name: "Gustavo Lima" })).toBeVisible()
    await expect(page.getByText("Unidade Aldeota, Unidade Caucaia").first()).toBeVisible()

    await page.getByRole("tab", { name: "Alunos" }).click()
    const students = page.getByRole("region", { name: "Alunos vinculados" })
    await expect(students.getByRole("row").filter({ hasText: "Ana Beatriz Souza" })).toContainText("Mãe")
    await expect(students.getByRole("row").filter({ hasText: "Bruno Lima" })).toContainText("ALU-000002")

    // The student's name opens its profile.
    await students.getByRole("link", { name: "Bruno Lima" }).click()
    await expect(page).toHaveURL(/\/administration\/students\/202$/)
  })

  test("opens from the list and from a student's guardians", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, guardiansPath)

    await page.getByRole("button", { name: "Ações de Helena Rocha" }).click()
    await page.getByRole("menuitem", { name: "Ver perfil" }).click()
    await expect(page).toHaveURL(/\/administration\/guardians\/303$/)

    await page.goto("/administration/students/201")
    await page.getByRole("tab", { name: "Responsáveis" }).click()
    await page.getByRole("link", { name: "Fernanda Souza" }).click()
    await expect(page).toHaveURL(/\/administration\/guardians\/301$/)
  })

  test("edits the data, the units staying as they are", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/302`)

    await chooseAction(page, "Editar dados")
    await expect(page.getByRole("heading", { level: 1, name: "Editar responsável" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Unidade" })).toContainText("Unidade Aldeota, Unidade Caucaia")
    await page.getByRole("textbox", { name: /^Nome social/ }).fill("Guga Lima")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()

    await expect(page).toHaveURL(/\/administration\/guardians\/302$/)
    await expect(page.getByText("Dados do responsável atualizados.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/guardians/302")?.body).toMatchObject({ socialName: "Guga Lima", version: 0 })
  })

  test("changes the nickname the guardian signs in with", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/302/edit`)

    const nickname = page.getByRole("region", { name: "Acesso" }).getByRole("textbox", { name: /^Apelido/ })
    await expect(nickname).toHaveValue("gustavo.302")
    await nickname.fill("ana.souza482")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(nickname).toHaveAccessibleDescription("Esse apelido já está em uso. Escolha outro.")

    await nickname.fill("gustavo.lima")
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(page).toHaveURL(/\/administration\/guardians\/302$/)
    expect(lastCall(calls, "PUT", "/api/guardians/302")?.body).toMatchObject({ nickname: "gustavo.lima" })
  })

  test("refuses to inactivate the only guardian of an active student", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/301`)

    await chooseAction(page, "Inativar responsável")
    const confirm = page.getByRole("dialog", { name: "Inativar Fernanda Souza?" })
    await confirm.getByRole("button", { name: "Inativar" }).click()

    await expect(confirm.getByRole("alert")).toContainText("único responsável de um aluno ativo")
  })

  test("inactivates and reactivates a guardian", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, `${guardiansPath}/302`)

    await chooseAction(page, "Inativar responsável")
    await page.getByRole("dialog", { name: "Inativar Gustavo Lima?" }).getByRole("button", { name: "Inativar" }).click()
    await expect(page.getByText("Responsável inativado.")).toBeVisible()

    await chooseAction(page, "Reativar responsável")
    await page.getByRole("dialog", { name: "Reativar Gustavo Lima?" }).getByRole("button", { name: "Reativar" }).click()
    await expect(page.getByText("Responsável reativado.")).toBeVisible()
  })
})
