import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The enrollments of the EPIC 6 (P05, slices 0 and 1): the list, a new preparation, the enrollment with
// its pendencies and history, and giving a preparation up. The backend is mocked
// (e2e/support/enrollments.ts) and keeps what is saved; the signed-in user is an Admin unless a test says
// otherwise.

const enrollmentsPath = "/administration/enrollments"

// Someone with a single role in Unidade Aldeota.
const withRole = (role: string) => ({
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role }],
  roles: [role],
})

const rowOf = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

// Picks an option of a select inside `scope` (the page or a dialog); the options open in a portal.
const pick = async (page: Page, scope: Locator | Page, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const chooseAction = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Ações da matrícula" }).click()
  await page.getByRole("menuitem", { name }).click()
}

test.describe("enrollments list", () => {
  test("lists the enrollments in reach, the abandoned ones only when asked for", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, "/home")
    await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Matrículas" }).click()

    await expect(page).toHaveURL(new RegExp(`${enrollmentsPath}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Matrículas" })).toBeVisible()
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("Em preparação")
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("4 pendências")
    await expect(rowOf(page, "Bruno Lima")).toContainText("Ativa")
    await expect(rowOf(page, "Carla Dias")).toHaveCount(0)

    await pick(page, page, /^Situação/, "Abandonada")
    await expect(rowOf(page, "Carla Dias")).toContainText("Abandonada")
    await expect(rowOf(page, "Ana Beatriz Souza")).toHaveCount(0)
  })

  test("lets the Financeiro read the enrollments, without starting one", async ({ page }) => {
    await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, enrollmentsPath, withRole("FINANCEIRO"))

    await expect(rowOf(page, "Ana Beatriz Souza")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova matrícula" })).toHaveCount(0)

    await page.goto(`${enrollmentsPath}/501`)
    await expect(page.getByRole("heading", { level: 1, name: "Ana Beatriz Souza" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toHaveCount(0)
    // The Financeiro doesn't open Pessoas: the student's name isn't a link.
    await expect(page.getByRole("link", { name: "Ana Beatriz Souza" })).toHaveCount(0)
  })

  test("keeps the enrollments closed to the Professor", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, enrollmentsPath, withRole("PROFESSOR"))

    await expect(page).toHaveURL(/\/access-denied$/)
  })
})

test.describe("new preparation", () => {
  test("starts a preparation for a student chosen in the unit, without confirming it", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, enrollmentsPath)

    await page.getByRole("button", { name: "Nova matrícula" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova matrícula" })
    await expect(dialog.getByRole("searchbox", { name: /^Aluno/ })).toBeDisabled()

    await pick(page, dialog, /^Unidade/, "Unidade Aldeota")
    await dialog.getByRole("searchbox", { name: /^Aluno/ }).fill("Carla")
    await dialog.getByRole("button", { name: "Escolher Carla Dias" }).click()
    await expect(dialog.getByRole("note")).toContainText("só é confirmada com o aluno ativo")
    await dialog.getByRole("button", { name: "Iniciar preparação" }).click()

    await expect(page).toHaveURL(new RegExp(`${enrollmentsPath}/600$`))
    await expect(page.getByText("Preparação iniciada. Ela ainda não é uma matrícula confirmada.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Carla Dias" })).toBeVisible()
    await expect(page.getByRole("region", { name: "O que falta" })).toContainText("O cadastro do aluno não está ativo")
    expect(lastCall(calls, "POST", "/api/enrollments")?.body).toEqual({ studentId: 203, unitId: 1 })
  })

  test("points to the enrollment the student already has in the unit instead of a second one", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, enrollmentsPath)

    await page.getByRole("button", { name: "Nova matrícula" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova matrícula" })
    await pick(page, dialog, /^Unidade/, "Unidade Aldeota")
    await dialog.getByRole("searchbox", { name: /^Aluno/ }).fill("Ana")
    await dialog.getByRole("button", { name: "Escolher Ana Beatriz Souza" }).click()
    await dialog.getByRole("button", { name: "Iniciar preparação" }).click()

    await expect(dialog.getByRole("alert")).toContainText("já tem uma matrícula em andamento ou ativa nesta unidade")
    await dialog.getByRole("button", { name: "Abrir a matrícula existente" }).click()
    await expect(page).toHaveURL(new RegExp(`${enrollmentsPath}/501$`))
  })
})

test.describe("enrollment", () => {
  test("shows the preparation, what is missing and the stages not evaluated yet", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)

    await expect(page.getByRole("heading", { level: 1, name: "Ana Beatriz Souza" })).toBeVisible()
    await expect(page.getByText("Em preparação", { exact: true })).toBeVisible()
    const missing = page.getByRole("region", { name: "O que falta" })
    await expect(missing).toContainText("Nenhum responsável escolhido")
    await expect(missing).toContainText("Nenhuma turma escolhida")
    const notEvaluated = page.getByRole("region", { name: "Etapas ainda não avaliadas" })
    await expect(notEvaluated).toContainText("Documentos")
    await expect(notEvaluated).toContainText("Ainda não avaliado")
    await expect(page.getByRole("link", { name: "Ana Beatriz Souza" })).toHaveAttribute(
      "href",
      "/administration/students/201",
    )

    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Preparação iniciada" })).toContainText("João Silva")
  })

  test("gives a preparation up with a reason, keeping it in the history", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)

    await chooseAction(page, "Abandonar preparação")
    const dialog = page.getByRole("dialog", { name: "Abandonar a preparação de Ana Beatriz Souza?" })
    await dialog.getByRole("button", { name: "Abandonar" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveAccessibleDescription("Informe o motivo.")

    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("A família desistiu da vaga")
    await dialog.getByRole("button", { name: "Abandonar" }).click()

    await expect(page.getByText("Preparação abandonada.")).toBeVisible()
    await expect(page.getByText("Abandonada", { exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "Motivo do abandono" })).toContainText("A família desistiu da vaga")
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/enrollments/501/abandon")?.body).toEqual({
      reason: "A família desistiu da vaga",
      version: 0,
    })

    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Preparação abandonada" })).toContainText(
      "Em preparação → Abandonada",
    )
  })

  test("says when the enrollment isn't in reach", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/999`)

    await expect(page.getByText("Matrícula não encontrada")).toBeVisible()
  })
})

test.describe("enrollment guardians", () => {
  const guardianItem = (page: Page, name: string) =>
    page.getByRole("list", { name: "Responsáveis do aluno" }).getByRole("listitem").filter({ hasText: name })

  test("chooses who takes part, who is financial and who signs, never an ended link", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await expect(guardianItem(page, "Fernanda Souza")).toContainText("Mãe")
    await expect(guardianItem(page, "Gustavo Lima")).toContainText("Vínculo encerrado")
    await expect(page.getByRole("list", { name: "O que falta nos responsáveis" })).toContainText(
      "Nenhum responsável escolhido",
    )

    await page.getByRole("button", { name: "Alterar escolhas" }).click()
    const gustavo = guardianItem(page, "Gustavo Lima")
    await expect(gustavo.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeDisabled()
    const fernanda = guardianItem(page, "Fernanda Souza")
    await expect(fernanda.getByRole("checkbox", { name: "Financeiro" })).toBeDisabled()
    await fernanda.getByRole("checkbox", { name: "Participa desta matrícula" }).check()
    await fernanda.getByRole("checkbox", { name: "Financeiro" }).check()
    await fernanda.getByRole("checkbox", { name: "Assina" }).check()
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByText("Escolhas dos responsáveis salvas.")).toBeVisible()
    await expect(guardianItem(page, "Fernanda Souza")).toContainText("Nesta matrícula: Financeiro · Assina")
    await expect(page.getByRole("list", { name: "O que falta nos responsáveis" })).toHaveCount(0)
    expect(lastCall(calls, "PUT", "/api/enrollments/501/parties")?.body).toEqual({
      parties: [{ financial: true, guardianId: 301, signatory: true }],
      version: 0,
    })

    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Responsáveis alterados" })).toContainText(
      "Responsáveis, Responsável financeiro, Quem assina",
    )
  })

  test("keeps the choices when someone else changed the enrollment meanwhile", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { conflictOnFirstSave: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await page.getByRole("button", { name: "Alterar escolhas" }).click()
    const fernanda = guardianItem(page, "Fernanda Souza")
    await fernanda.getByRole("checkbox", { name: "Participa desta matrícula" }).check()
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByRole("alert")).toContainText("as suas escolhas foram mantidas")
    await expect(fernanda.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeChecked()
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByText("Escolhas dos responsáveis salvas.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/enrollments/501/parties")?.body).toMatchObject({ version: 1 })
  })

  test("shows the guardians without changing them to the Coordenação", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`, withRole("COORDENACAO"))
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await expect(guardianItem(page, "Fernanda Souza")).toContainText("Não participa desta matrícula")
    await expect(page.getByRole("button", { name: "Alterar escolhas" })).toHaveCount(0)
    // The Coordenação doesn't read the kinship catalog, which is the Secretaria's.
    expect(calls.some((call) => call.path === "/api/catalogs/relationship-types")).toBe(false)
  })
})

test.describe("enrollment class", () => {
  const classItem = (page: Page, code: string) =>
    page.getByRole("list", { name: "Turmas abertas para matrícula" }).getByRole("listitem").filter({ hasText: code })

  test("chooses a class with its seats read now, never reserving one", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Turma" }).click()

    await expect(page.getByText("Nenhuma turma escolhida ainda.")).toBeVisible()
    await page.getByRole("button", { name: "Escolher turma" }).click()

    await expect(classItem(page, "1A")).toContainText("28 alunos matriculados")
    await expect(classItem(page, "1A")).toContainText("2 vagas")
    await expect(classItem(page, "1B")).toContainText("Sem vaga")
    await expect(classItem(page, "1C")).toContainText("Ocupação indisponível agora (não quer dizer turma vazia)")
    await expect(classItem(page, "1C")).toContainText("Vagas indisponíveis agora")

    await page.getByRole("button", { name: "Escolher a turma 1A" }).click()
    await expect(page.getByText("Turma escolhida. Nenhuma vaga foi reservada.")).toBeVisible()
    await expect(page.getByRole("region", { name: "Turma da matrícula" })).toContainText("1A · 1º ano A")
    await expect(page.getByRole("list", { name: "O que falta na turma" })).toHaveCount(0)
    expect(lastCall(calls, "PUT", "/api/enrollments/501/context")?.body).toEqual({ classId: 701, version: 0 })
  })

  test("asks before changing or taking back the class", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Turma" }).click()
    await page.getByRole("button", { name: "Escolher turma" }).click()
    await page.getByRole("button", { name: "Escolher a turma 1A" }).click()
    await expect(page.getByText("Turma escolhida. Nenhuma vaga foi reservada.")).toBeVisible()

    await page.getByRole("button", { name: "Trocar turma" }).click()
    await page.getByRole("button", { name: "Escolher a turma 1B" }).click()
    const change = page.getByRole("dialog", { name: "Trocar para a turma 1B?" })
    await expect(change).toContainText("Escolher a turma não reserva vaga.")
    await change.getByRole("button", { name: "Trocar" }).click()
    await expect(page.getByRole("list", { name: "O que falta na turma" })).toContainText(
      "A turma escolhida não tem vaga",
    )

    await page.getByRole("button", { name: "Desfazer escolha" }).click()
    await page
      .getByRole("dialog", { name: "Desfazer a escolha da turma?" })
      .getByRole("button", { name: "Desfazer escolha" })
      .click()
    await expect(page.getByText("Escolha da turma desfeita.")).toBeVisible()
    await expect(page.getByText("Nenhuma turma escolhida ainda.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/enrollments/501/context")?.body).toEqual({ classId: null, version: 2 })

    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Turma alterada" })).toHaveCount(3)
  })
})
