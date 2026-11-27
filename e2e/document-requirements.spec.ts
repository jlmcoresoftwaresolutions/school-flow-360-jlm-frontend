import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The school's catalog of enrollment documents (EPIC 6, P05 slice 3B): only the Admin writes, the
// Secretaria reads, and a requirement is born withdrawn. The backend is mocked
// (e2e/support/enrollments.ts) and keeps what is saved; the signed-in user is an Admin unless a test says
// otherwise.

const requirementsPath = "/administration/document-requirements"

const rowOf = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

// The row of a unit policy's scope: a stage and a kind of enrollment.
const policyRow = (page: Page, stage: string, kind: string) =>
  page.getByRole("row").filter({ hasText: stage }).filter({ hasText: kind })

// Picks an option of a select inside `scope` (the page or a dialog); the options open in a portal.
const pick = async (page: Page, scope: Locator | Page, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("document requirements", () => {
  test("lists the catalog, where each requirement applies and whether it is published", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, "/home")
    await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Documentos exigidos" }).click()

    await expect(page).toHaveURL(new RegExp(`${requirementsPath}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Documentos exigidos" })).toBeVisible()
    await expect(rowOf(page, "Identificação do aluno")).toContainText("Publicada")
    await expect(rowOf(page, "Identificação do aluno")).toContainText("Todas as unidades e etapas")
    await expect(rowOf(page, "Identificação do aluno")).toContainText("sem exceção")
    await expect(rowOf(page, "Comprovante de endereço")).toContainText("Retirada")
    await expect(rowOf(page, "Comprovante de endereço")).toContainText("vale 90 dias")
    await expect(rowOf(page, "Histórico escolar")).toContainText("Unidade Aldeota")
    await expect(rowOf(page, "Histórico escolar")).toContainText("Transferência")

    await pick(page, page, /^Situação/, "Publicada")
    await expect(rowOf(page, "Comprovante de endereço")).toHaveCount(0)
    await expect(rowOf(page, "Identificação do aluno")).toBeVisible()
  })

  test("registers a requirement, born withdrawn, and publishes it", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, requirementsPath)

    await page.getByRole("button", { name: "Nova exigência" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova exigência" })
    await dialog.getByRole("button", { name: "Cadastrar" }).click()
    await expect(dialog.getByText("Informe o nome.")).toBeVisible()
    await expect(dialog.getByText("Escolha ao menos um tipo de documento.")).toBeVisible()

    await dialog.getByRole("textbox", { name: /^Código/ }).fill("saude_vacinas")
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Carteira de vacinação")
    await pick(page, dialog, /^Etapa/, "Educação Infantil")
    await dialog.getByRole("checkbox", { name: "RG" }).check()
    await dialog.getByRole("textbox", { name: /^Validade em dias/ }).fill("365")
    await dialog.getByRole("button", { name: "Cadastrar" }).click()

    await expect(page.getByText("Exigência cadastrada, ainda retirada.")).toBeVisible()
    await expect(rowOf(page, "Carteira de vacinação")).toContainText("Retirada")
    await expect(rowOf(page, "Carteira de vacinação")).toContainText("Educação Infantil")
    expect(lastCall(calls, "POST", "/api/enrollment-documents/requirements")?.body).toMatchObject({
      acceptedTypes: ["RG"],
      code: "SAUDE_VACINAS",
      enrollmentKind: "ALL",
      exemptable: true,
      label: "Carteira de vacinação",
      mandatory: true,
      party: "STUDENT",
      stageId: 1,
      unitId: null,
      validityDays: 365,
    })

    await page.getByRole("button", { name: "Ações de Carteira de vacinação" }).click()
    await page.getByRole("menuitem", { name: "Publicar" }).click()
    await page
      .getByRole("dialog", { name: "Publicar Carteira de vacinação?" })
      .getByRole("button", { name: "Publicar" })
      .click()
    await expect(page.getByText("Exigência publicada.")).toBeVisible()
    await expect(rowOf(page, "Carteira de vacinação")).toContainText("Publicada")
  })

  test("edits a requirement, keeping its code, and points out a repeated one", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, requirementsPath)

    await page.getByRole("button", { name: "Ações de Comprovante de endereço" }).click()
    await page.getByRole("menuitem", { name: "Editar" }).click()
    const edit = page.getByRole("dialog", { name: "Editar Comprovante de endereço" })
    await expect(edit.getByRole("textbox", { name: /^Código/ })).toBeDisabled()
    await expect(edit.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await edit.getByRole("textbox", { name: /^Validade em dias/ }).fill("60")
    await edit.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Exigência atualizada.")).toBeVisible()
    await expect(rowOf(page, "Comprovante de endereço")).toContainText("vale 60 dias")
    expect(lastCall(calls, "PUT", "/api/enrollment-documents/requirements/32")?.body).toMatchObject({
      code: "PROOF_OF_ADDRESS",
      validityDays: 60,
      version: 0,
    })

    await page.getByRole("button", { name: "Nova exigência" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova exigência" })
    await dialog.getByRole("textbox", { name: /^Código/ }).fill("STUDENT_ID")
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Identidade de novo")
    await dialog.getByRole("checkbox", { name: "CPF" }).check()
    await dialog.getByRole("button", { name: "Cadastrar" }).click()
    await expect(dialog.getByText("Já existe uma exigência com este código")).toBeVisible()
    await expect(dialog.getByRole("textbox", { name: /^Código/ })).toHaveAttribute("aria-invalid", "true")
  })

  test("lets the Secretaria read the catalog and the unit policies, without changing them", async ({ page }) => {
    await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, requirementsPath, secretariaContext)

    await expect(rowOf(page, "Identificação do aluno")).toBeVisible()
    await expect(page.getByText("Só a Administração altera as exigências.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova exigência" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)

    await page.getByRole("tab", { name: "Política por unidade" }).click()
    await expect(policyRow(page, "Educação Infantil", "Transferência")).toContainText("Pendente")
    await expect(page.getByText("Você pode consultar a política. Só o Admin publica e retira.")).toBeVisible()
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
  })

  test("never lets the identity of who signs be waived", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, requirementsPath)

    await page.getByRole("button", { name: "Nova exigência" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova exigência" })
    const exemptable = dialog.getByRole("checkbox", { name: "Pode ter exceção" })
    await expect(exemptable).toBeChecked()
    await dialog.getByRole("textbox", { name: /^Código/ }).fill("signatory_id")
    await expect(exemptable).toBeDisabled()
    await expect(exemptable).not.toBeChecked()
    await expect(dialog).toContainText(
      "A identificação de quem assina e a comprovação de representação nunca podem ser dispensadas.",
    )
    await dialog.getByRole("textbox", { name: /^Nome/ }).fill("Identificação de quem assina")
    await dialog.getByRole("checkbox", { name: "RG" }).check()
    await dialog.getByRole("button", { name: "Cadastrar" }).click()

    await expect(page.getByText("Exigência cadastrada, ainda retirada.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/enrollment-documents/requirements")?.body).toMatchObject({
      code: "SIGNATORY_ID",
      exemptable: false,
    })
  })

  test("publishes a unit's document policy, refusing a declaration the catalog contradicts", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, requirementsPath)

    await page.getByRole("tab", { name: "Política por unidade" }).click()
    const row = policyRow(page, "Educação Infantil", "Transferência")
    await expect(row).toContainText("Pendente")
    await expect(row).toContainText("Nada publicado")

    await page.getByRole("button", { name: "Ações de Educação Infantil · Transferência" }).click()
    await page.getByRole("menuitem", { name: "Publicar" }).click()
    const dialog = page.getByRole("dialog", { name: "Publicar a política de documentos" })
    await expect(dialog).toContainText("Unidade Aldeota")
    await dialog.getByRole("button", { name: "Publicar" }).click()
    await expect(dialog.getByText("Escolha a declaração.")).toBeVisible()

    // The student's identity is mandatory everywhere: the unit can't say nothing blocks.
    await pick(page, dialog, /^Declaração/, "Sem exigência impeditiva")
    await dialog.getByRole("button", { name: "Publicar" }).click()
    await expect(dialog.getByText(/Há exigência obrigatória publicada para esta unidade/)).toBeVisible()

    await pick(page, dialog, /^Declaração/, "Usa as exigências do catálogo")
    await dialog.getByRole("textbox", { name: /^Observação/ }).fill("Regra da rede")
    await dialog.getByRole("button", { name: "Publicar" }).click()

    await expect(page.getByText("Política publicada.")).toBeVisible()
    await expect(row).toContainText("Usa o catálogo")
    await expect(row).toContainText("Regra da rede")
    expect(lastCall(calls, "PUT", "/api/document-policies")?.body).toEqual({
      enrollmentKind: "TRANSFER",
      mode: "USE_CATALOG",
      note: "Regra da rede",
      stageId: 1,
      unitId: 1,
    })
    // The other scopes stay pending.
    await expect(policyRow(page, "Educação Infantil", "Rematrícula")).toContainText("Pendente")

    await page.getByRole("button", { name: "Ações de Educação Infantil · Transferência" }).click()
    await page.getByRole("menuitem", { name: "Retirar" }).click()
    await page
      .getByRole("dialog", { name: "Retirar a política de documentos?" })
      .getByRole("button", { name: "Retirar" })
      .click()
    await expect(page.getByText("Política retirada.")).toBeVisible()
    await expect(row).toContainText("Pendente")
    await expect(row).toContainText("Retirada")
    expect(lastCall(calls, "POST", "/api/document-policies/70/withdraw")?.body).toEqual({ version: 0 })
  })
})
