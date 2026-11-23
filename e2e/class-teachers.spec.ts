import type { Locator } from "@playwright/test"

import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The Teachers tab of a class (P04 phase 5): the links with their dates and state, linking a Professor of
// the unit (searched by name) to a subject of the class - never twice in the same dates, another teacher
// only as joint teaching -, editing a link's dates (a past date only for the Admin and the Coordenação,
// with a reason) and ending a link with a reason. The backend is mocked (e2e/support/academic.ts); the
// signed-in user is an Admin unless a test says otherwise.

const classPath = "/academic/classes/61"

const today = () => new Date().toLocaleDateString("en-CA")

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const openTeachers = async (page: Page) => {
  await page.getByRole("tab", { name: "Professores" }).click()
  await expect(row(page, "Carla Mendes")).toBeVisible()
}

const chooseAction = async (page: Page, name: string, action: string) => {
  await page.getByRole("button", { exact: true, name: `Ações do vínculo de ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

// Picks an option of a select, inside a dialog when one is given.
const pick = async (page: Page, label: RegExp, option: string, scope: Locator | Page = page) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const professor = { ...secretariaContext, assignments: [secretariaContext.assignments[1]], roles: ["PROFESSOR"] }

test("lists the class's teacher links with their dates and state", async ({ page }) => {
  await mockAcademicApi(page)
  await signInAndOpen(page, classPath)
  await openTeachers(page)

  const current = row(page, "Carla Mendes")
  await expect(current).toContainText("MAT · Matemática")
  await expect(current).toContainText("A partir de 02/02/2026")
  await expect(current).toContainText("Vigente")
  const ended = row(page, "Paulo Rocha")
  await expect(ended).toContainText("02/02/2026 a 30/06/2026")
  await expect(ended).toContainText("Encerrado")
  await expect(page.getByRole("button", { name: "Ações do vínculo de Paulo Rocha" })).toHaveCount(0)
})

test("links a teacher once per subject and dates, another one only as joint teaching", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, classPath)
  await openTeachers(page)

  await page.getByRole("button", { name: "Vincular professor" }).click()
  const dialog = page.getByRole("dialog", { name: "Vincular professor" })
  await dialog.getByRole("button", { exact: true, name: "Vincular" }).click()
  await expect(dialog.getByRole("searchbox", { name: /^Professor/ })).toHaveAccessibleDescription(
    "Escolha o professor.",
  )

  await dialog.getByRole("searchbox", { name: /^Professor/ }).fill("car")
  const results = dialog.getByRole("list", { name: "Professores encontrados" })
  await expect(results).toContainText("Carla Mendes")
  await expect(results).toContainText("Nº 503 · Com acesso ao sistema")
  await dialog.getByRole("button", { name: "Escolher Carla Mendes" }).click()
  await pick(page, /^Disciplina/, "MAT · Matemática", dialog)
  await dialog.getByRole("button", { exact: true, name: "Vincular" }).click()
  await expect(dialog.getByRole("alert")).toContainText(
    "Este professor já está vinculado a esta disciplina nessas datas.",
  )

  await dialog.getByRole("button", { name: "Trocar" }).click()
  await dialog.getByRole("searchbox", { name: /^Professor/ }).fill("souza")
  await dialog.getByRole("button", { name: "Escolher Carla Souza" }).click()
  await dialog.getByRole("button", { exact: true, name: "Vincular" }).click()
  await expect(dialog.getByRole("checkbox", { name: "Docência compartilhada" })).toHaveAccessibleDescription(
    /Outro professor já leciona esta disciplina nessas datas/,
  )

  await pick(page, /^Disciplina/, "POR · Língua Portuguesa", dialog)
  await dialog.getByRole("button", { exact: true, name: "Vincular" }).click()
  await expect(page.getByText("Carla Souza vinculado à turma.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/classes/61/teachers")?.body).toEqual({
    joint: false,
    startDate: today(),
    subjectId: 32,
    teacherUserId: 503,
  })
  await expect(row(page, "Carla Souza")).toContainText("Vigente")
})

test("asks the reason of a start in the past, and saves it", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, classPath)
  await openTeachers(page)

  await chooseAction(page, "Carla Mendes", "Editar datas")
  const dialog = page.getByRole("dialog", { name: "Editar o vínculo de Carla Mendes" })
  await dialog.getByRole("textbox", { name: /^Início/ }).fill("01/03/2026")
  await dialog.getByRole("textbox", { name: /^Início/ }).press("Tab")
  await dialog.getByRole("button", { name: "Salvar" }).click()
  const reason = dialog.getByRole("textbox", { name: /^Motivo da data no passado/ })
  await expect(reason).toHaveAccessibleDescription("Informe o motivo.")

  await reason.fill("Começou em março")
  await dialog.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Vínculo atualizado.")).toBeVisible()
  expect(lastCall(calls, "PUT", "/api/academic/teacher-links/71")?.body).toEqual({
    joint: false,
    reason: "Começou em março",
    startDate: "2026-03-01",
    version: 0,
  })
  await expect(row(page, "Carla Mendes")).toContainText("A partir de 01/03/2026")
})

test("ends a link with a reason, keeping it listed", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, classPath)
  await openTeachers(page)

  await chooseAction(page, "Carla Mendes", "Encerrar vínculo")
  const dialog = page.getByRole("dialog", { name: "Encerrar o vínculo de Carla Mendes?" })
  await dialog.getByRole("button", { name: "Encerrar" }).click()
  await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveAccessibleDescription("Informe o motivo.")

  await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Troca de turma")
  await dialog.getByRole("button", { name: "Encerrar" }).click()
  await expect(page.getByText("Vínculo de Carla Mendes encerrado.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/teacher-links/71/end")?.body).toEqual({
    endDate: today(),
    reason: "Troca de turma",
    version: 0,
  })
  await expect(row(page, "Carla Mendes")).toBeVisible()
  await expect(page.getByRole("button", { name: "Ações do vínculo de Carla Mendes" })).toHaveCount(0)
})

test("doesn't let a Secretaria give a link a date in the past", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, classPath, secretariaContext)
  await openTeachers(page)

  await chooseAction(page, "Carla Mendes", "Editar datas")
  const dialog = page.getByRole("dialog", { name: "Editar o vínculo de Carla Mendes" })
  const start = dialog.getByRole("textbox", { name: /^Início/ })
  await start.fill("01/03/2026")
  await start.press("Tab")
  await dialog.getByRole("button", { name: "Salvar" }).click()

  await expect(start).toHaveAccessibleDescription(
    "Só a Administração ou a Coordenação da unidade registram datas no passado.",
  )
  await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveCount(0)
  expect(lastCall(calls, "PUT", "/api/academic/teacher-links/71")).toBeUndefined()
})

test("lets a Professor read the links, without any change", async ({ page }) => {
  await mockAcademicApi(page, { readOnly: true })
  await signInAndOpen(page, classPath, professor)
  await openTeachers(page)

  await expect(page.getByRole("button", { name: "Vincular professor" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Ações do vínculo/ })).toHaveCount(0)
})
