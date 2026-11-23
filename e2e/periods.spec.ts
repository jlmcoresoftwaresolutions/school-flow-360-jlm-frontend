import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The school periods of the P04 (phase 1): the list and its filters, registering and editing a period
// with a review before saving, activating it, and closing it with its reason and what blocks it. The
// backend is mocked (e2e/support/academic.ts) and keeps what is saved; the signed-in user is an Admin
// unless a test says otherwise.

const periodsPath = "/academic/periods"

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const typeDate = async (page: Page, label: RegExp, value: string) => {
  const field = page.getByRole("textbox", { name: label })
  await field.fill(value)
  await field.press("Tab")
}

const periodRow = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name })

const chooseAction = async (page: Page, name: string, action: string) => {
  await page.getByRole("button", { name: `Ações de ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

test.describe("periods list", () => {
  test("lists the periods with their kind, validity, units and status, and filters them", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    const current = periodRow(page, "Ano letivo 2026")
    await expect(current).toContainText("Anual")
    await expect(current).toContainText("02/02/2026 a 18/12/2026")
    await expect(current).toContainText("Unidade Aldeota, Unidade Caucaia")
    await expect(current).toContainText("Ativo")
    await expect(periodRow(page, "1º semestre 2027")).toContainText("Configurado")

    await pick(page, /^Situação/, "Encerrado")
    await expect(periodRow(page, "Ano letivo 2025")).toBeVisible()
    await expect(periodRow(page, "Ano letivo 2026")).toHaveCount(0)
    expect(lastCall(calls, "GET", "/api/academic/periods")?.query).toMatchObject({ page: "0", status: "CLOSED" })
  })

  test("lets a Professor read the periods, without any action", async ({ page }) => {
    const professor = {
      ...secretariaContext,
      assignments: [secretariaContext.assignments[1]],
      roles: ["PROFESSOR"],
    }
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, periodsPath, professor)

    await expect(periodRow(page, "Ano letivo 2026")).toBeVisible()
    await expect(page.getByRole("button", { name: "Novo período" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
  })
})

test.describe("period registration", () => {
  test("reviews and saves a new period as configured", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await page.getByRole("button", { name: "Novo período" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo período letivo" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("2º semestre 2027")
    await dialog.getByRole("textbox", { name: /^Ano de referência/ }).fill("2027")
    await pick(page, /^Tipo/, "Semestral")
    await typeDate(page, /^Data inicial/, "02/08/2027")
    await typeDate(page, /^Data final/, "17/12/2027")
    await dialog.getByRole("checkbox", { name: "Unidade Aldeota" }).check()
    await dialog.getByRole("button", { name: "Revisar" }).click()

    await expect(dialog).toContainText("O período será salvo como configurado")
    await expect(dialog).toContainText("02/08/2027 a 17/12/2027")
    await dialog.getByRole("button", { name: "Cadastrar período" }).click()

    await expect(page.getByText("Período cadastrado como configurado.")).toBeVisible()
    await expect(periodRow(page, "2º semestre 2027")).toContainText("Configurado")
    expect(lastCall(calls, "POST", "/api/academic/periods")?.body).toEqual({
      endDate: "2027-12-17",
      kind: "SEMESTER",
      name: "2º semestre 2027",
      referenceYear: 2027,
      startDate: "2027-08-02",
      unitIds: [1],
    })
  })

  test("points out both dates when the start is after the end, keeping the rest", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await page.getByRole("button", { name: "Novo período" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo período letivo" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Ano letivo 2028")
    await dialog.getByRole("textbox", { name: /^Ano de referência/ }).fill("2028")
    await pick(page, /^Tipo/, "Anual")
    await typeDate(page, /^Data inicial/, "01/02/2028")
    await typeDate(page, /^Data final/, "30/01/2028")
    await dialog.getByRole("checkbox", { name: "Unidade Caucaia" }).check()
    await dialog.getByRole("button", { name: "Revisar" }).click()

    const message = "A data inicial não pode ser posterior à data final."
    await expect(dialog.getByRole("textbox", { name: /^Data inicial/ })).toHaveAccessibleDescription(message)
    await expect(dialog.getByRole("textbox", { name: /^Data final/ })).toHaveAccessibleDescription(message)
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Ano letivo 2028")
    expect(lastCall(calls, "POST", "/api/academic/periods")).toBeUndefined()
  })

  test("explains an overlap with another period of the same kind", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await page.getByRole("button", { name: "Novo período" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo período letivo" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Ano letivo 2027 bis")
    await dialog.getByRole("textbox", { name: /^Ano de referência/ }).fill("2027")
    await pick(page, /^Tipo/, "Anual")
    await typeDate(page, /^Data inicial/, "01/03/2027")
    await typeDate(page, /^Data final/, "30/11/2027")
    await dialog.getByRole("checkbox", { name: "Unidade Caucaia" }).check()
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Cadastrar período" }).click()

    await expect(dialog.getByRole("textbox", { name: /^Data inicial/ })).toHaveAccessibleDescription(
      "Estas datas coincidem com outro período do mesmo tipo em uma das unidades.",
    )
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Ano letivo 2027 bis")
  })

  test("edits a period, keeping the draft when someone else changed it first", async ({ page }) => {
    const { calls } = await mockAcademicApi(page, { changedPeriodId: 11 })
    await signInAndOpen(page, periodsPath)

    await chooseAction(page, "1º semestre 2027", "Editar")
    const dialog = page.getByRole("dialog", { name: "Editar 1º semestre 2027" })
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("1º semestre de 2027")
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Salvar alterações" }).click()

    await expect(dialog.getByRole("alert").first()).toContainText("Outra pessoa alterou")
    await expect(dialog.getByRole("textbox", { name: /^Nome/ })).toHaveValue("1º semestre de 2027")

    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Período atualizado.")).toBeVisible()
    expect(lastCall(calls, "PUT", "/api/academic/periods/11")?.body).toMatchObject({
      name: "1º semestre de 2027",
      version: 1,
    })
  })
})

test.describe("period status", () => {
  test("activates a configured period, saying what it means", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await chooseAction(page, "1º semestre 2027", "Ativar")
    const dialog = page.getByRole("dialog", { name: "Ativar 1º semestre 2027?" })
    await expect(dialog).toContainText("só pode ser encerrado")
    await dialog.getByRole("button", { name: "Ativar período" }).click()

    await expect(page.getByText("1º semestre 2027 ativado.")).toBeVisible()
    await expect(periodRow(page, "1º semestre 2027")).toContainText("Ativo")
    expect(lastCall(calls, "POST", "/api/academic/periods/11/activate")?.body).toEqual({ version: 0 })
  })

  test("lists what blocks closing a period, keeping it active", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await chooseAction(page, "Ano letivo 2026", "Encerrar")
    const dialog = page.getByRole("dialog", { name: "Encerrar Ano letivo 2026?" })
    const blockers = dialog.getByRole("list", { name: "O que impede o encerramento" })
    await expect(blockers).toContainText("2 turma(s) ativa(s) neste período")
    await expect(blockers).toContainText("1 vínculo(s) de professor em andamento")
    await expect(dialog.getByRole("button", { name: "Encerrar período" })).toBeDisabled()
  })

  test("closes a period with its reason, deleting nothing", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, periodsPath)

    await chooseAction(page, "Ano letivo 2027", "Encerrar")
    const dialog = page.getByRole("dialog", { name: "Encerrar Ano letivo 2027?" })
    await expect(dialog).toContainText("Nada é apagado")
    await expect(dialog).toContainText("O período tem 3 ofertas ativas")
    await dialog.getByRole("button", { name: "Encerrar período" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Motivo do encerramento/ })).toHaveAccessibleDescription(
      "Informe o motivo do encerramento.",
    )

    await dialog.getByRole("textbox", { name: /^Motivo do encerramento/ }).fill("Unidade encerrou o ano antes")
    await dialog.getByRole("button", { name: "Encerrar período" }).click()

    await expect(page.getByText("Ano letivo 2027 encerrado.")).toBeVisible()
    await expect(periodRow(page, "Ano letivo 2027")).toContainText("Encerrado")
    expect(lastCall(calls, "POST", "/api/academic/periods/13/close")?.body).toEqual({
      reason: "Unidade encerrou o ano antes",
      version: 0,
    })
  })
})
