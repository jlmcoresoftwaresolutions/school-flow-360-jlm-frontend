import type { Locator } from "@playwright/test"

import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The classes of the P04 (phase 4): the list (search and filters, readiness for enrollment and what is
// still missing), creating a class in preparation inside an active offer, editing its name, shift and
// room with a version conflict that keeps the draft, activating it (stopped by what the backend names)
// and inactivating it (blocked while the enrollment source doesn't answer), and the class's detail with
// its General tab. The backend is mocked (e2e/support/academic.ts); the signed-in user is an Admin unless
// a test says otherwise.

const classesPath = "/academic/classes"

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const chooseAction = async (page: Page, name: string, action: string) => {
  await page.getByRole("button", { exact: true, name: `Ações de ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

// Picks an option of a select, inside a dialog when one is given.
const pick = async (page: Page, label: RegExp, option: string, scope: Locator | Page = page) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const professor = { ...secretariaContext, assignments: [secretariaContext.assignments[1]], roles: ["PROFESSOR"] }

test.describe("classes list", () => {
  test("lists the classes with their readiness, and searches and filters them", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, classesPath)

    const ready = row(page, "1A-MAN")
    await expect(ready).toContainText("1º ano A")
    await expect(ready).toContainText("Ensino Fundamental")
    await expect(ready).toContainText("Unidade Aldeota")
    await expect(ready).toContainText("Ano letivo 2026")
    await expect(ready).toContainText("Manhã")
    await expect(ready).toContainText("Capacidade: 30")
    await expect(ready).toContainText("Ativa")
    await expect(ready).toContainText("Pronta para matrícula")
    await expect(row(page, "1B-TAR")).toContainText("Em preparação")
    await expect(row(page, "1B-TAR")).toContainText("Sem professor")

    await page.getByRole("searchbox", { name: "Buscar turma" }).fill("noite")
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(row(page, "1A-NOI")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/academic/classes")?.query).toMatchObject({ page: "0", q: "noite" })

    await page.getByRole("searchbox", { name: "Buscar turma" }).fill("")
    await pick(page, /^Situação/, "Ativa")
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(row(page, "1A-MAN")).toBeVisible()
  })

  test("creates a class in preparation inside an active offer, with a unique code", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, classesPath)

    await page.getByRole("button", { name: "Nova turma" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova turma" })
    await dialog.getByRole("button", { name: "Criar turma" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Código/ })).toHaveAccessibleDescription(
      "Informe o código da turma.",
    )

    await pick(page, /^Unidade/, "Unidade Aldeota", dialog)
    await pick(page, /^Período letivo/, "Ano letivo 2026", dialog)
    await pick(page, /^Série/, "Ensino Fundamental · 1º ano", dialog)
    const subjects = dialog.getByRole("group", { name: "Disciplinas da turma" })
    await expect(subjects.getByRole("checkbox", { name: "MAT · Matemática" })).toBeChecked()
    await subjects.getByRole("checkbox", { name: "POR · Língua Portuguesa" }).uncheck()

    await dialog.getByRole("textbox", { name: /^Código/ }).fill("1a-man")
    await dialog.getByRole("textbox", { name: /^Capacidade/ }).fill("32")
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("1º ano C")
    await pick(page, /^Turno/, "Integral", dialog)
    await dialog.getByRole("button", { name: "Criar turma" }).click()
    await expect(dialog.getByRole("combobox", { name: /^Sala/ })).toHaveAccessibleDescription(
      /Selecione a sala ou marque sem sala física\.$/,
    )

    await pick(page, /^Sala/, "Sala 101", dialog)
    await dialog.getByRole("button", { name: "Criar turma" }).click()
    const code = dialog.getByRole("textbox", { name: /^Código/ })
    await expect(code).toHaveAccessibleDescription("Já existe uma turma com esse código nesta unidade e período.")

    await code.fill("1C-INT")
    await dialog.getByRole("button", { name: "Criar turma" }).click()
    await expect(page.getByText("Turma criada em preparação.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/classes")?.body).toEqual({
      capacity: 32,
      code: "1C-INT",
      gradeId: 21,
      name: "1º ano C",
      periodId: 10,
      roomId: 51,
      shift: "INTEGRAL",
      subjectIds: [31],
      unitId: 1,
    })

    await expect(page).toHaveURL(/\/academic\/classes\/160$/)
    await expect(page.getByRole("heading", { level: 1, name: "1º ano C" })).toBeVisible()
    await expect(page.getByText("Em preparação").first()).toBeVisible()
  })

  test("keeps the draft when someone else changed the class first", async ({ page }) => {
    const { calls } = await mockAcademicApi(page, { changedClassId: 61 })
    await signInAndOpen(page, classesPath)

    await chooseAction(page, "1º ano A", "Editar")
    const dialog = page.getByRole("dialog", { name: "Editar 1º ano A" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("1º ano A - Manhã")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(dialog.getByRole("alert").first()).toContainText("Outra pessoa alterou")
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("1º ano A - Manhã")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Turma atualizada.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/classes/61")?.body).toEqual({
      name: "1º ano A - Manhã",
      roomId: 51,
      shift: "MANHA",
      version: 1,
    })
  })

  test("names what stops activating a class, and activates another", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, classesPath)

    await chooseAction(page, "1º ano B", "Ativar")
    const blocked = page.getByRole("dialog", { name: "Ativar 1º ano B?" })
    await expect(blocked.getByRole("list", { name: "O que impede a ativação" })).toContainText(
      "A capacidade precisa ser maior que zero",
    )
    await expect(blocked.getByRole("button", { name: "Ativar" })).toBeDisabled()
    await blocked.getByRole("button", { name: "Cancelar" }).click()

    await chooseAction(page, "2º ano A", "Ativar")
    await page.getByRole("dialog", { name: "Ativar 2º ano A?" }).getByRole("button", { name: "Ativar" }).click()
    await expect(page.getByText("2º ano A: ativação concluída.")).toBeVisible()
    await expect(row(page, "2A-MAN")).toContainText("Ativa")
  })

  test("blocks inactivating a class while the enrollment source doesn't answer", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, classesPath)

    await chooseAction(page, "1º ano A", "Inativar")
    const dialog = page.getByRole("dialog", { name: "Inativar 1º ano A?" })
    await expect(dialog.getByRole("list", { name: "O que impede a inativação" })).toContainText(
      "A Matrícula não respondeu, então não é possível comprovar que não há alunos",
    )
    await expect(dialog.getByRole("button", { name: "Inativar" })).toBeDisabled()
  })

  test("lets a Professor read the classes, with no change offered", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, classesPath, professor)

    await expect(row(page, "1A-MAN")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova turma" })).toHaveCount(0)
    await page.getByRole("button", { exact: true, name: "Ações de 1º ano A" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Abrir turma"])
  })
})

test.describe("class detail", () => {
  test("shows the General tab, and edits the shift and room from the detail", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, classesPath)

    await page.getByRole("link", { name: "1º ano A" }).click()
    await expect(page).toHaveURL(/\/academic\/classes\/61$/)
    await expect(page.getByRole("heading", { level: 1, name: "1º ano A" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Geral" })).toHaveAttribute("aria-selected", "true")
    const identification = page.getByRole("region", { name: "Identificação" })
    await expect(identification).toContainText("1A-MAN")
    await expect(identification).toContainText("Sala 101")
    await expect(identification).toContainText("Ano letivo 2026")
    await expect(page.getByRole("region", { name: "Situação" })).toContainText("Pronta para matrícula")
    await expect(page.getByRole("region", { name: "Disciplinas" })).toContainText(
      "MAT · Matemática, POR · Língua Portuguesa",
    )

    await page.getByRole("button", { name: "Ações da turma" }).click()
    await page.getByRole("menuitem", { name: "Editar" }).click()
    const dialog = page.getByRole("dialog", { name: "Editar 1º ano A" })
    await pick(page, /^Turno/, "Tarde", dialog)
    await dialog.getByRole("checkbox", { name: "Sem sala física" }).check()
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Turma atualizada.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/classes/61")?.body).toEqual({
      name: "1º ano A",
      noPhysicalRoom: true,
      shift: "TARDE",
      version: 0,
    })
    await expect(page.getByRole("region", { name: "Identificação" })).toContainText("Sem sala física")
    await expect(page.getByRole("region", { name: "Identificação" })).toContainText("Tarde")
  })

  test("tells a class that doesn't exist apart", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, `${classesPath}/999`)

    await expect(page.getByText("Turma não encontrada")).toBeVisible()
    await page.getByRole("button", { name: "Voltar às turmas" }).click()
    await expect(page).toHaveURL(/\/academic\/classes$/)
  })

  test("lets a Professor read a class's detail, without actions", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, `${classesPath}/63`, professor)

    await expect(page.getByRole("heading", { level: 1, name: "1º ano Noite" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Identificação" })).toContainText("Unidade Caucaia")
    await expect(page.getByRole("button", { name: "Ações da turma" })).toHaveCount(0)
  })
})
