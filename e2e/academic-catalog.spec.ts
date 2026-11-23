import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The academic catalog of the P04 (phase 2): the stages and grades of the institution and its subjects -
// listing, the similar items while creating, a repeated name or code on its field, a version conflict
// that keeps the draft, and inactivating (blocked by what depends on the item) and reactivating. The
// backend is mocked (e2e/support/academic.ts); the signed-in user is an Admin unless a test says otherwise.

const gradeLevelsPath = "/academic/grade-levels"
const subjectsPath = "/academic/subjects"

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const chooseAction = async (page: Page, name: string, action: string) => {
  await page.getByRole("button", { name: `Ações de ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("stages", () => {
  test("lists the stages in their order, with their status", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, gradeLevelsPath)

    await expect(row(page, "Educação Infantil")).toContainText("Ativo")
    await expect(row(page, "Ensino Médio")).toContainText("Inativo")
    await expect(page.getByRole("row").nth(1)).toContainText("Educação Infantil")
  })

  test("shows the similar stages while creating, and a repeated name on its field", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, gradeLevelsPath)

    await page.getByRole("button", { name: "Nova etapa" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova etapa" })
    const name = dialog.getByRole("textbox", { name: /^Nome/ })
    await name.fill("Ensino")
    await expect(dialog.getByRole("status")).toContainText(
      "Já existem itens parecidos: Ensino Fundamental, Ensino Médio",
    )

    await name.fill("Ensino Fundamental")
    await dialog.getByRole("button", { name: "Cadastrar etapa" }).click()
    await expect(name).toHaveAccessibleDescription("Já existe uma etapa com esse nome.")

    await name.fill("Ensino Técnico")
    await dialog.getByRole("textbox", { name: /^Ordem/ }).fill("4")
    await dialog.getByRole("button", { name: "Cadastrar etapa" }).click()
    await expect(page.getByText("Etapa cadastrada.")).toBeVisible()
    await expect(row(page, "Ensino Técnico")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/stages")?.body).toEqual({ name: "Ensino Técnico", sortOrder: 4 })
  })

  test("lists what blocks inactivating a stage, and reactivates another", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, gradeLevelsPath)

    await chooseAction(page, "Ensino Fundamental", "Inativar")
    const inactivate = page.getByRole("dialog", { name: "Inativar Ensino Fundamental?" })
    await expect(inactivate.getByRole("list", { name: "O que impede a inativação" })).toContainText(
      "2 série(s) ativa(s) desta etapa",
    )
    await expect(inactivate.getByRole("button", { name: "Inativar" })).toBeDisabled()
    await inactivate.getByRole("button", { name: "Cancelar" }).click()

    await chooseAction(page, "Ensino Médio", "Reativar")
    await page.getByRole("dialog", { name: "Reativar Ensino Médio?" }).getByRole("button", { name: "Reativar" }).click()
    await expect(page.getByText("Ensino Médio: reativação concluída.")).toBeVisible()
    await expect(row(page, "Ensino Médio")).toContainText("Ativo")
  })
})

test.describe("grades", () => {
  test("creates a grade from its stage, keeping the stage fixed", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, gradeLevelsPath)

    await chooseAction(page, "Ensino Fundamental", "Nova série")
    const dialog = page.getByRole("dialog", { name: "Nova série" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("3º ano")
    await dialog.getByRole("textbox", { name: /^Ordem/ }).fill("3")
    await dialog.getByRole("button", { name: "Cadastrar série" }).click()

    await expect(page.getByText("Série cadastrada.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/grades")?.body).toEqual({ name: "3º ano", sortOrder: 3, stageId: 2 })

    await page.getByRole("tab", { name: "Séries" }).click()
    await expect(row(page, "3º ano")).toContainText("Ensino Fundamental")

    await chooseAction(page, "3º ano", "Editar")
    await expect(page.getByRole("dialog", { name: "Editar 3º ano" })).toContainText(
      "A etapa não muda depois do cadastro.",
    )
  })

  test("filters the grades by stage and points out a name repeated in the stage", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, gradeLevelsPath)
    await page.getByRole("tab", { name: "Séries" }).click()

    await pick(page, /^Etapa/, "Educação Infantil")
    await expect(row(page, "Infantil 5")).toBeVisible()
    await expect(row(page, "1º ano")).toHaveCount(0)

    await page.getByRole("button", { name: "Nova série" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova série" })
    await dialog.getByRole("combobox", { name: /^Etapa/ }).click()
    await page.getByRole("option", { exact: true, name: "Ensino Fundamental" }).click()
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("2º ano")
    await dialog.getByRole("button", { name: "Cadastrar série" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveAccessibleDescription(
      "Já existe uma série com esse nome nesta etapa.",
    )
  })
})

test.describe("subjects", () => {
  test("points out a repeated code on its field, keeping the rest", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, subjectsPath)

    await expect(row(page, "Matemática")).toContainText("MAT")
    await page.getByRole("button", { name: "Nova disciplina" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova disciplina" })
    await dialog.getByRole("textbox", { name: /^Código/ }).fill("mat")
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Matemática Aplicada")
    await dialog.getByRole("button", { name: "Cadastrar disciplina" }).click()

    await expect(dialog.getByRole("textbox", { name: /^Código/ })).toHaveAccessibleDescription(
      "Já existe uma disciplina com esse código.",
    )
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Matemática Aplicada")

    await dialog.getByRole("textbox", { name: /^Código/ }).fill("MATAP")
    await dialog.getByRole("button", { name: "Cadastrar disciplina" }).click()
    await expect(page.getByText("Disciplina cadastrada.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/subjects")?.body).toEqual({
      code: "MATAP",
      name: "Matemática Aplicada",
    })
  })

  test("keeps the draft when someone else changed the subject first", async ({ page }) => {
    const { calls } = await mockAcademicApi(page, { changedCatalogItem: "subjects/32" })
    await signInAndOpen(page, subjectsPath)

    await chooseAction(page, "Língua Portuguesa", "Editar")
    const dialog = page.getByRole("dialog", { name: "Editar Língua Portuguesa" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Português")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(dialog.getByRole("alert").first()).toContainText("Outra pessoa alterou")
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Português")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Disciplina atualizada.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/subjects/32")?.body).toMatchObject({ name: "Português", version: 1 })
  })

  test("lists what blocks inactivating a subject, and inactivates another", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, subjectsPath)

    await chooseAction(page, "Matemática", "Inativar")
    const blocked = page.getByRole("dialog", { name: "Inativar Matemática?" })
    const blockers = blocked.getByRole("list", { name: "O que impede a inativação" })
    await expect(blockers).toContainText("3 oferta(s) ativa(s) que ensinam esta disciplina")
    await expect(blockers).toContainText("2 turma(s) que ensinam esta disciplina")
    await blocked.getByRole("button", { name: "Cancelar" }).click()

    await chooseAction(page, "Língua Portuguesa", "Inativar")
    const dialog = page.getByRole("dialog", { name: "Inativar Língua Portuguesa?" })
    await expect(dialog).toContainText("Nada é apagado")
    await dialog.getByRole("button", { name: "Inativar" }).click()
    await expect(page.getByText("Língua Portuguesa: inativação concluída.")).toBeVisible()
    await expect(row(page, "Língua Portuguesa")).toContainText("Inativo")
  })

  test("lets a Professor read the subjects, without any action", async ({ page }) => {
    const professor = { ...secretariaContext, assignments: [secretariaContext.assignments[1]], roles: ["PROFESSOR"] }
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, subjectsPath, professor)

    await expect(row(page, "Matemática")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova disciplina" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
  })
})
