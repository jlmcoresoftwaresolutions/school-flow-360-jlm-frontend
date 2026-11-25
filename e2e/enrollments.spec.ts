import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { apiAnswer, expect, type Page, test } from "./support/test.ts"
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
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("5 pendências")
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
    // The kind picks the school's document requirements; a new enrollment is the default.
    await expect(dialog.getByRole("combobox", { name: /^Tipo de matrícula/ })).toBeVisible()
    await expect(dialog.getByText("Nova", { exact: true })).toBeVisible()
    await pick(page, dialog, /^Tipo de matrícula/, "Transferência")
    await dialog.getByRole("button", { name: "Iniciar preparação" }).click()

    await expect(page).toHaveURL(new RegExp(`${enrollmentsPath}/600$`))
    await expect(page.getByText("Preparação iniciada. Ela ainda não é uma matrícula confirmada.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Carla Dias" })).toBeVisible()
    await expect(page.getByRole("region", { name: "O que falta" })).toContainText("O cadastro do aluno não está ativo")
    expect(lastCall(calls, "POST", "/api/enrollments")?.body).toEqual({ kind: "TRANSFER", studentId: 203, unitId: 1 })
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
    await expect(missing).toContainText("Defina quem participa desta matrícula")
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
    // A linked guardian isn't a participant yet: the pendency asks to define them, with the action beside it.
    const pendencies = page.getByRole("list", { name: "O que falta nos responsáveis" })
    await expect(pendencies).toContainText("Defina quem participa desta matrícula")
    await pendencies.getByRole("button", { name: "Escolher participantes" }).click()

    // The choice opens with suggestions: the current link takes part and, as the only financial guardian in
    // Pessoas, is the financial party; nobody is suggested to sign. Nothing is saved yet.
    await expect(page.getByRole("note")).toContainText("Confira e salve")
    const gustavo = guardianItem(page, "Gustavo Lima")
    await expect(gustavo.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeDisabled()
    await expect(gustavo.getByRole("checkbox", { name: "Participa desta matrícula" })).not.toBeChecked()
    const fernanda = guardianItem(page, "Fernanda Souza")
    await expect(fernanda.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeChecked()
    await expect(fernanda.getByRole("checkbox", { name: "Financeiro" })).toBeChecked()
    await expect(fernanda.getByRole("checkbox", { name: "Assina" })).not.toBeChecked()
    await expect(page.getByText("Defina quem assina o contrato desta matrícula.")).toBeVisible()
    expect(calls.some((call) => call.method === "PUT")).toBe(false)

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

    await page.getByRole("button", { name: "Escolher participantes" }).first().click()
    const fernanda = guardianItem(page, "Fernanda Souza")
    await fernanda.getByRole("checkbox", { name: "Assina" }).check()
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByRole("alert")).toContainText("as suas escolhas foram mantidas")
    await expect(fernanda.getByRole("checkbox", { name: "Assina" })).toBeChecked()
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByText("Escolhas dos responsáveis salvas.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/enrollments/501/parties")?.body).toMatchObject({ version: 1 })
  })

  test("asks which one pays when more than one guardian is financial in Pessoas", async ({ page }) => {
    await mockEnrollmentApi(page, { secondFinancialGuardian: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)

    // The action beside the pendency on the Preparation opens the choice in this tab.
    await page
      .getByRole("region", { name: "O que falta" })
      .getByRole("button", { name: "Escolher participantes" })
      .click()
    await expect(page.getByRole("tab", { name: "Responsáveis" })).toHaveAttribute("aria-selected", "true")

    const fernanda = guardianItem(page, "Fernanda Souza")
    const helena = guardianItem(page, "Helena Souza")
    await expect(fernanda.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeChecked()
    await expect(helena.getByRole("checkbox", { name: "Participa desta matrícula" })).toBeChecked()
    // Two candidates: neither is marked financial; the screen asks for the decision.
    await expect(fernanda.getByRole("checkbox", { name: "Financeiro" })).not.toBeChecked()
    await expect(helena.getByRole("checkbox", { name: "Financeiro" })).not.toBeChecked()
    await expect(helena).toContainText("Responsável financeiro no cadastro do aluno")
    await expect(page.getByText("Mais de um responsável é financeiro no cadastro do aluno.")).toBeVisible()

    await helena.getByRole("checkbox", { name: "Financeiro" }).check()
    await expect(page.getByText("Mais de um responsável é financeiro no cadastro do aluno.")).toHaveCount(0)
  })

  test("shows the guardians without changing them to the Coordenação", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`, withRole("COORDENACAO"))
    await page.getByRole("tab", { name: "Responsáveis" }).click()

    await expect(guardianItem(page, "Fernanda Souza")).toContainText("Não participa desta matrícula")
    await expect(page.getByRole("button", { name: "Alterar escolhas" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Escolher participantes" })).toHaveCount(0)
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

    // Without a class chosen, the classes to choose from show at once, right below the choice (above the
    // start date).
    await expect(page.getByText("Selecione uma turma para realização da matrícula.")).toBeVisible()
    await expect(classItem(page, "1A")).toContainText("28 alunos matriculados")
    const optionsTop = (await page.getByRole("region", { name: "Turmas disponíveis" }).boundingBox())?.y ?? 0
    const startDateTop = (await page.getByRole("region", { name: "Data de início" }).boundingBox())?.y ?? 0
    expect(optionsTop).toBeLessThan(startDateTop)

    await expect(classItem(page, "1A")).toContainText("2 vagas")
    await expect(classItem(page, "1B")).toContainText("Sem vaga")
    await expect(classItem(page, "1C")).toContainText("Ocupação indisponível agora (não quer dizer turma vazia)")
    await expect(classItem(page, "1C")).toContainText("Vagas indisponíveis agora")

    await page.getByRole("button", { name: "Escolher a turma 1A" }).click()
    await expect(page.getByText("Turma escolhida. Nenhuma vaga foi reservada.")).toBeVisible()
    await expect(page.getByRole("region", { name: "Turma da matrícula" })).toContainText("1A · 1º ano A")
    // Only the start date is left of the class's part.
    await expect(page.getByRole("list", { name: "O que falta na turma" })).toHaveText(
      "Nenhuma data de início escolhida",
    )
    expect(lastCall(calls, "PUT", "/api/enrollments/501/context")?.body).toEqual({ classId: 701, version: 0 })
  })

  test("asks before changing or taking back the class", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Turma" }).click()
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
    await expect(page.getByText("Selecione uma turma para realização da matrícula.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/enrollments/501/context")?.body).toEqual({ classId: null, version: 2 })

    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Turma alterada" })).toHaveCount(3)
  })
})

test.describe("enrollment class without classes", () => {
  test("doesn't ask to choose a class when the unit has none open", async ({ page }) => {
    await mockEnrollmentApi(page)
    await page.route("**/api/enrollments/501/classes", (route) => route.fulfill(apiAnswer([])))
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Turma" }).click()

    await expect(page.getByRole("region", { name: "Turmas disponíveis" })).toContainText(
      "Nenhuma turma desta unidade está aberta para matrícula",
    )
    await expect(page.getByText("Selecione uma turma para realização da matrícula.")).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Turma da matrícula" })).not.toContainText("Nenhuma turma escolhida")
  })
})

test.describe("start date and confirmation", () => {
  test("chooses the start date once the class is chosen, never in the past", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { readyButStartDate: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    // Only the start date is missing: no confirmation yet.
    await expect(page.getByRole("button", { name: "Confirmar matrícula" })).toHaveCount(0)
    await page.getByRole("tab", { name: "Turma" }).click()

    const startDate = page.getByRole("region", { name: "Data de início" })
    await expect(startDate).toContainText("Nenhuma data escolhida.")
    await startDate.getByRole("button", { name: "Escolher data" }).click()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const typed = tomorrow.toLocaleDateString("pt-BR")
    await startDate.getByRole("textbox", { name: /^Data de início/ }).fill(typed)
    await startDate.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Data de início salva.")).toBeVisible()
    await expect(startDate).toContainText(typed)
    expect(lastCall(calls, "PUT", "/api/enrollments/501/start-date")?.body).toEqual({
      startDate: tomorrow.toLocaleDateString("en-CA"),
      version: 0,
    })
    // Nothing is missing now: the enrollment can be confirmed.
    await expect(page.getByRole("button", { name: "Confirmar matrícula" })).toBeVisible()
  })

  test("confirms the enrollment, which gets its number", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { readyButStartDate: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Turma" }).click()
    const startDate = page.getByRole("region", { name: "Data de início" })
    await startDate.getByRole("button", { name: "Escolher data" }).click()
    await startDate.getByRole("textbox", { name: /^Data de início/ }).fill(new Date().toLocaleDateString("pt-BR"))
    await startDate.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Data de início salva.")).toBeVisible()

    await page.getByRole("button", { name: "Confirmar matrícula" }).click()
    const dialog = page.getByRole("dialog", { name: "Confirmar a matrícula de Ana Beatriz Souza?" })
    await expect(dialog).toContainText("1A · 1º ano A")
    await expect(dialog).toContainText("Fernanda Souza")
    await expect(dialog).toContainText("Confirmar não registra pagamento nem gera cobrança.")
    await dialog.getByRole("button", { name: "Confirmar matrícula" }).click()

    await expect(page.getByText("Matrícula confirmada: 2027-000042.")).toBeVisible()
    await expect(page.getByText("Matrícula 2027-000042")).toBeVisible()
    await expect(page.getByText("Ativa", { exact: true }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar matrícula" })).toHaveCount(0)
    const body = lastCall(calls, "POST", "/api/enrollments/501/confirm")?.body as { intent: string; version: number }
    expect(body.version).toBe(1)
    expect(body.intent).toMatch(/^[0-9a-f-]{36}$/)
  })

  test("shows the number and the start date of a confirmed enrollment", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, enrollmentsPath)

    await expect(page.getByRole("row").filter({ hasText: "Bruno Lima" })).toContainText("2027-000041")

    await page.goto(`${enrollmentsPath}/502`)
    await expect(page.getByText("Matrícula 2027-000041")).toBeVisible()
    await expect(page.getByText("Início em 01/02/2027")).toBeVisible()
  })
})

test.describe("enrollment documents", () => {
  const pdf = (name: string) => ({ buffer: Buffer.from("%PDF-1.4 documento"), mimeType: "application/pdf", name })
  const lineOf = (page: Page, text: string) =>
    page.getByRole("list", { name: "Documentos da matrícula" }).getByRole("listitem").filter({ hasText: text })
  const openLineAction = async (page: Page, label: string, action: string) => {
    await page.getByRole("button", { name: `Ações de ${label}` }).click()
    await page.getByRole("menuitem", { name: action }).click()
  }

  test("sends a document and checks it, approving or rejecting with a reason", async ({ page }) => {
    const api = await mockEnrollmentApi(page, { documents: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await expect(page.getByText("Documentos obrigatórios pendentes")).toBeVisible()
    await page.getByRole("tab", { name: "Documentos" }).click()

    await expect(lineOf(page, "Documento de identidade")).toContainText("Pendente")
    await expect(lineOf(page, "Documento de identidade")).toContainText("Impede a confirmação")

    await openLineAction(page, "Documento de identidade", "Enviar arquivo")
    const dialog = page.getByRole("dialog", { name: "Enviar documento" })
    await dialog.getByLabel(/^Arquivo/).setInputFiles(pdf("rg-ana.pdf"))
    await dialog.getByRole("button", { name: "Enviar" }).click()
    await expect(page.getByText("Documento enviado. A escola ainda precisa conferi-lo.")).toBeVisible()
    await expect(lineOf(page, "Documento de identidade")).toContainText("Recebido")
    await expect(lineOf(page, "Documento de identidade")).toContainText("rg-ana.pdf")
    const upload = lastCall(api.calls, "POST", "/api/enrollments/501/documents/11/file")
    expect(String(upload?.body)).toContain('name="documentType"\r\n\r\nRG')

    await openLineAction(page, "Documento de identidade", "Recusar")
    const reject = page.getByRole("dialog", { name: "Recusar Documento de identidade?" })
    await reject.getByRole("button", { name: "Recusar" }).click()
    await expect(reject.getByText("Informe o motivo da recusa.")).toBeVisible()
    await reject.getByLabel(/^Motivo da recusa/).fill("Documento ilegível")
    await reject.getByRole("button", { name: "Recusar" }).click()
    await expect(lineOf(page, "Documento de identidade")).toContainText("Recusado: Documento ilegível")

    await openLineAction(page, "Documento de identidade", "Enviar outro arquivo")
    await dialog.getByLabel(/^Arquivo/).setInputFiles(pdf("rg-ana-novo.pdf"))
    await dialog.getByRole("button", { name: "Enviar" }).click()
    await expect(lineOf(page, "Documento de identidade")).toContainText("Recebido")

    await openLineAction(page, "Documento de identidade", "Aprovar")
    await page
      .getByRole("dialog", { name: "Aprovar Documento de identidade?" })
      .getByRole("button", { name: "Aprovar" })
      .click()
    await expect(lineOf(page, "Documento de identidade")).toContainText("Aprovado")
    await expect(lineOf(page, "Documento de identidade")).not.toContainText("Impede a confirmação")
  })

  test("asks for an exception, and lets only another Admin decide one", async ({ page }) => {
    const api = await mockEnrollmentApi(page, { documents: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`)
    await page.getByRole("tab", { name: "Documentos" }).click()

    // The identity document is a legal obligation: it can't be waived.
    await page.getByRole("button", { name: "Ações de Documento de identidade" }).click()
    await expect(page.getByRole("menuitem", { name: "Pedir exceção" })).toHaveCount(0)
    await page.keyboard.press("Escape")

    // The transcript's exception was asked by the Secretaria: the Admin decides it, with a reason.
    const exceptions = page.getByRole("list", { name: "Exceções de documentos" })
    const transcript = exceptions.getByRole("listitem").filter({ hasText: "Histórico escolar" })
    await expect(transcript).toContainText("Pedida")
    await transcript.getByRole("button", { name: "Aprovar exceção" }).click()
    const decide = page.getByRole("dialog", { name: "Aprovar a exceção de Histórico escolar?" })
    await decide.getByLabel(/^Motivo da decisão/).fill("A família entrega na próxima semana")
    await decide.getByRole("button", { name: "Aprovar exceção" }).click()
    await expect(page.getByText("Exceção aprovada.")).toBeVisible()
    await expect(lineOf(page, "Histórico escolar")).toContainText("Coberto por exceção")
    await expect(transcript).toContainText("Decisão: A família entrega na próxima semana")
    expect(lastCall(api.calls, "POST", "/api/enrollments/501/exceptions/801/decision")?.body).toMatchObject({
      decision: "APPROVE",
      reason: "A família entrega na próxima semana",
      version: 0,
    })

    // An exception the Admin asks for waits for another person of the Administration.
    await openLineAction(page, "Comprovante de residência", "Pedir exceção")
    const request = page.getByRole("dialog", { name: "Pedir exceção para Comprovante de residência?" })
    await request.getByLabel(/^Motivo/).fill("A família mudou de endereço")
    await request.getByRole("button", { name: "Pedir exceção" }).click()
    await expect(page.getByText("Exceção pedida. A Administração decide.")).toBeVisible()
    const residence = exceptions.getByRole("listitem").filter({ hasText: "Comprovante de residência" })
    await expect(residence).toContainText("Aguardando a decisão da Administração.")
    await expect(residence.getByRole("button", { name: "Aprovar exceção" })).toHaveCount(0)
    await expect(lineOf(page, "Comprovante de residência")).toContainText("Exceção pedida")
  })

  test("keeps the documents away from the Coordenação", async ({ page }) => {
    await mockEnrollmentApi(page, { documents: true, readOnly: true })
    await signInAndOpen(page, `${enrollmentsPath}/501`, withRole("COORDENACAO"))
    await expect(page.getByRole("tab", { name: "Preparação" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Documentos" })).toHaveCount(0)
  })
})
