import type { Locator } from "@playwright/test"

import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The offers and rooms of the P04 (phase 3): the offers of each unit and period with the subjects they
// teach - listing and filtering, creating one (each combination once) and choosing its subjects, a
// version conflict that keeps the choice, and inactivating (blocked while classes depend on it) and
// reactivating - and the physical rooms of each unit. The backend is mocked (e2e/support/academic.ts);
// the signed-in user is an Admin unless a test says otherwise.

const offersPath = "/academic/offers"
const roomsPath = "/academic/rooms"

const firstOffer = "1º ano · Unidade Aldeota · Ano letivo 2026"

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

test.describe("offers", () => {
  test("lists the offers with their grade, unit, period and subjects, and filters by period", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, offersPath)

    const first = row(page, "Unidade Aldeota").filter({ hasText: "1º ano" })
    await expect(first).toContainText("Ensino Fundamental")
    await expect(first).toContainText("Ano letivo 2026")
    await expect(first).toContainText("Matemática, Língua Portuguesa")
    await expect(row(page, "2º ano")).toContainText("Sem disciplinas")
    await expect(row(page, "Unidade Caucaia")).toContainText("Inativo")

    await pick(page, /^Período letivo/, "Ano letivo 2027")
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(row(page, "Unidade Caucaia")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/academic/offers")?.query).toMatchObject({ page: "0", periodId: "13" })
  })

  test("creates an offer once per combination, then chooses its subjects", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, offersPath)

    await page.getByRole("button", { name: "Nova oferta" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova oferta" })
    await dialog.getByRole("button", { name: "Cadastrar oferta" }).click()
    await expect(dialog.getByRole("combobox", { name: /^Unidade/ })).toHaveAccessibleDescription(
      /Selecione a unidade.$/,
    )

    await pick(page, /^Unidade/, "Unidade Aldeota", dialog)
    await pick(page, /^Período letivo/, "Ano letivo 2026", dialog)
    await pick(page, /^Série/, "Ensino Fundamental · 1º ano", dialog)
    await dialog.getByRole("button", { name: "Cadastrar oferta" }).click()
    const grade = dialog.getByRole("combobox", { name: /^Série/ })
    await expect(grade).toHaveAccessibleDescription("Esta série já é oferecida nesta unidade e neste período.")

    await pick(page, /^Série/, "Educação Infantil · Infantil 5", dialog)
    await dialog.getByRole("button", { name: "Cadastrar oferta" }).click()
    expect(lastCall(calls, "POST", "/api/academic/offers")?.body).toEqual({ gradeId: 23, periodId: 10, unitId: 1 })

    const subjects = page.getByRole("dialog", { name: "Disciplinas de Infantil 5 · Unidade Aldeota · Ano letivo 2026" })
    await expect(subjects.getByRole("checkbox", { name: "ART · Artes" })).toHaveCount(0)
    await subjects.getByRole("checkbox", { name: "MAT · Matemática" }).check()
    await subjects.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Disciplinas da oferta salvas.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/offers/140/subjects")?.body).toEqual({ subjectIds: [31], version: 0 })
    await expect(row(page, "Infantil 5")).toContainText("Matemática")
  })

  test("keeps the chosen subjects when someone else changed the offer first", async ({ page }) => {
    const { calls } = await mockAcademicApi(page, { changedOfferId: 41 })
    await signInAndOpen(page, offersPath)

    await chooseAction(page, firstOffer, "Escolher disciplinas")
    const dialog = page.getByRole("dialog", { name: `Disciplinas de ${firstOffer}` })
    await dialog.getByRole("checkbox", { name: "POR · Língua Portuguesa" }).uncheck()
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(dialog.getByRole("alert").first()).toContainText("Outra pessoa alterou")
    await expect(dialog.getByRole("checkbox", { name: "POR · Língua Portuguesa" })).not.toBeChecked()
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Disciplinas da oferta salvas.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/offers/41/subjects")?.body).toEqual({ subjectIds: [31], version: 1 })
  })

  test("lists the classes that block inactivating an offer, and reactivates another", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, offersPath)

    await chooseAction(page, firstOffer, "Inativar")
    const blocked = page.getByRole("dialog", { name: `Inativar ${firstOffer}?` })
    await blocked.getByRole("button", { name: "Inativar" }).click()
    await expect(blocked.getByRole("list", { name: "O que impede a inativação" })).toContainText(
      "2 turma(s) desta oferta",
    )
    await blocked.getByRole("button", { name: "Cancelar" }).click()

    const inactive = "1º ano · Unidade Caucaia · Ano letivo 2027"
    await chooseAction(page, inactive, "Reativar")
    await page
      .getByRole("dialog", { name: `Reativar ${inactive}?` })
      .getByRole("button", { name: "Reativar" })
      .click()
    await expect(page.getByText(`${inactive}: reativação concluída.`)).toBeVisible()
    await expect(row(page, "Unidade Caucaia")).toContainText("Ativo")
  })

  test("lets a Professor read the offers, without any action", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, offersPath, professor)

    await expect(row(page, "Unidade Caucaia")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova oferta" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
  })
})

test.describe("rooms", () => {
  test("lists the rooms of a unit, creates one with a unique name, and switches unit", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, roomsPath)

    await expect(row(page, "Sala 101")).toContainText("Ativo")
    await expect(row(page, "Laboratório")).toContainText("Inativo")
    expect(lastCall(calls, "GET", "/api/academic/rooms")?.query).toEqual({ unitId: "1" })

    await page.getByRole("button", { name: "Nova sala" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova sala" })
    await expect(dialog).toContainText("Unidade: Unidade Aldeota.")
    const name = dialog.getByRole("textbox", { name: /^Nome/ })
    await name.fill("sala 101")
    await dialog.getByRole("button", { name: "Cadastrar sala" }).click()
    await expect(name).toHaveAccessibleDescription("Já existe uma sala com esse nome nesta unidade.")

    await name.fill("Sala 102")
    await dialog.getByRole("button", { name: "Cadastrar sala" }).click()
    await expect(page.getByText("Sala cadastrada.")).toBeVisible()
    await expect(row(page, "Sala 102")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/rooms")?.body).toEqual({ name: "Sala 102", unitId: 1 })

    await pick(page, /^Situação/, "Inativo")
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(row(page, "Laboratório")).toBeVisible()

    await pick(page, /^Unidade/, "Unidade Caucaia")
    await pick(page, /^Situação/, "Todas as situações")
    await expect(row(page, "Sala 201")).toBeVisible()
    await expect(row(page, "Sala 101")).toHaveCount(0)
  })

  test("renames a room, lists what blocks inactivating one, and reactivates another", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, roomsPath)

    await chooseAction(page, "Laboratório", "Renomear")
    const rename = page.getByRole("dialog", { name: "Renomear Laboratório" })
    await rename.getByRole("textbox", { name: /^Nome/ }).fill("Laboratório de Ciências")
    await rename.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Sala renomeada.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/rooms/52")?.body).toEqual({
      name: "Laboratório de Ciências",
      unitId: 1,
      version: 0,
    })

    await chooseAction(page, "Sala 101", "Inativar")
    const blocked = page.getByRole("dialog", { name: "Inativar Sala 101?" })
    await blocked.getByRole("button", { name: "Inativar" }).click()
    await expect(blocked.getByRole("list", { name: "O que impede a inativação" })).toContainText(
      "1 turma(s) que usam esta sala",
    )
    await blocked.getByRole("button", { name: "Cancelar" }).click()

    await chooseAction(page, "Laboratório de Ciências", "Reativar")
    await page
      .getByRole("dialog", { name: "Reativar Laboratório de Ciências?" })
      .getByRole("button", { name: "Reativar" })
      .click()
    await expect(page.getByText("Laboratório de Ciências: reativação concluída.")).toBeVisible()
    await expect(row(page, "Laboratório de Ciências")).toContainText("Ativo")
  })

  test("tells a Secretaria she only reads the rooms of a unit she doesn't manage", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, roomsPath, secretariaContext)

    await expect(page.getByRole("button", { name: "Nova sala" })).toBeVisible()
    await pick(page, /^Unidade/, "Unidade Caucaia")
    await expect(page.getByText("Você só consulta as salas de Unidade Caucaia.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova sala" })).toHaveCount(0)
  })

  test("lets a Professor read the rooms of their unit, without any action", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, roomsPath, professor)

    await expect(row(page, "Sala 201")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova sala" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
  })
})
