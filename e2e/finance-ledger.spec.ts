import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { mockFinanceLedgerApi } from "./support/finance.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The financial ledger (EPIC 8, Fatia 1): the installments (Mensalidades), one installment with its
// obligation and payments, the manual receipts (Conciliação), allocating a receipt to an installment and
// compensating it, and regularizing a confirmed enrollment with no obligation. The backend is mocked
// (e2e/support/finance.ts, with e2e/support/enrollments.ts for the enrollments and units); the signed-in
// user is an Admin unless a test says otherwise. Bruno Lima (enrollment 502, Unidade Caucaia) owes three
// installments of R$ 500,00: the first paid, the second overdue, the third to come.

const tuitionPath = "/finance/tuition"

const rowOf = (scope: Locator | Page, text: string) => scope.getByRole("row").filter({ hasText: text })

// Money as the screen writes it (pt-BR puts a no-break space after the symbol).
const brl = (value: string) => new RegExp(`R\\$\\s${value.replace(".", "\\.")}`)

test.describe("financial ledger", () => {
  test("lists the installments with their balance and opens one", async ({ page }) => {
    await mockEnrollmentApi(page)
    await mockFinanceLedgerApi(page)
    await signInAndOpen(page, tuitionPath)

    await expect(page.getByRole("heading", { level: 1, name: "Mensalidades" })).toBeVisible()
    await expect(rowOf(page, "Parcela 1")).toContainText("Paga")
    await expect(rowOf(page, "Parcela 2")).toContainText("Vencida")
    await expect(rowOf(page, "Parcela 3")).toContainText("Em aberto")

    await page.getByRole("combobox", { name: /^Vencimento/ }).click()
    await page.getByRole("option", { exact: true, name: "Só as vencidas" }).click()
    await expect(rowOf(page, "Parcela 1")).toHaveCount(0)
    await expect(rowOf(page, "Parcela 2")).toBeVisible()

    await page.getByRole("link", { name: "Parcela 2" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Parcela 2 · Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Obrigação" })).toContainText("Confirmação da matrícula")
    await expect(page.getByRole("region", { name: "Pagamentos" })).toContainText("Nenhum pagamento alocado.")
  })

  test("allocates a confirmed receipt to an installment and compensates it", async ({ page }) => {
    await mockEnrollmentApi(page)
    const { calls } = await mockFinanceLedgerApi(page)
    await signInAndOpen(page, `${tuitionPath}/702`)

    await page.getByRole("button", { name: "Registrar pagamento" }).click()
    const dialog = page.getByRole("dialog", { name: "Registrar pagamento na parcela 2" })
    await dialog.getByRole("combobox", { name: /^Recebimento/ }).click()
    await page.getByRole("option", { name: /Transferência/ }).click()
    await expect(dialog.getByRole("textbox", { name: /^Valor/ })).toHaveValue("300,00")
    await dialog.getByRole("button", { name: "Alocar" }).click()

    await expect(page.getByText("Pagamento alocado à parcela.")).toBeVisible()
    await expect(page.getByText("Paga em parte", { exact: true }).first()).toBeVisible()
    expect(lastCall(calls, "POST", "/api/finance/allocations")?.body).toMatchObject({
      amountCents: 30000,
      receiptId: 802,
      titleId: 702,
      titleVersion: 0,
    })
    const payments = page.getByRole("region", { name: "Pagamentos" })
    await expect(rowOf(payments, "Aplicado")).toContainText(brl("300,00"))

    await payments.getByRole("button", { name: /^Compensar o pagamento/ }).click()
    const reverse = page.getByRole("dialog", { name: /^Compensar o pagamento/ })
    await reverse.getByRole("textbox", { name: /^Motivo/ }).fill("Alocado na parcela errada")
    await reverse.getByRole("button", { name: "Compensar" }).click()
    await expect(page.getByText("Pagamento compensado.")).toBeVisible()
    await expect(payments).toContainText("Compensado")
    await expect(payments).toContainText("Alocado na parcela errada")
  })

  test("registers a manual receipt and validates a reported one", async ({ page }) => {
    await mockEnrollmentApi(page)
    const { calls } = await mockFinanceLedgerApi(page)
    await signInAndOpen(page, "/finance/reconciliation")

    await expect(rowOf(page, "Família mandou o comprovante")).toContainText("A validar")
    await page.getByRole("button", { name: /^Validar o recebimento/ }).click()
    await page
      .getByRole("dialog", { name: /^Validar o recebimento/ })
      .getByRole("button", { name: "Validar" })
      .click()
    await expect(page.getByText("Recebimento confirmado.")).toBeVisible()
    await expect(rowOf(page, "Família mandou o comprovante")).toContainText("Confirmado")

    await page.getByRole("button", { name: "Registrar recebimento" }).first().click()
    const dialog = page.getByRole("dialog", { name: "Registrar recebimento" })
    await dialog.getByRole("button", { name: "Registrar" }).click()
    await expect(dialog.getByText("Informe o valor bruto.")).toBeVisible()

    await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
    await page.getByRole("option", { exact: true, name: "Unidade Caucaia" }).click()
    await dialog.getByRole("combobox", { name: /^Tipo/ }).click()
    await page.getByRole("option", { exact: true, name: "Recebimento validado" }).click()
    await dialog.getByRole("combobox", { name: /^Meio/ }).click()
    await page.getByRole("option", { exact: true, name: "Dinheiro" }).click()
    await dialog.getByRole("textbox", { name: /^Recebido em/ }).fill(new Date().toLocaleDateString("pt-BR"))
    await dialog.getByRole("textbox", { name: /^Valor bruto/ }).fill("1.234,56")
    await dialog.getByRole("textbox", { name: /^Comprovante/ }).fill("Recibo 45 na secretaria")
    await dialog.getByRole("button", { name: "Registrar" }).click()

    await expect(page.getByText("Recebimento registrado.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/finance/receipts")?.body).toMatchObject({
      evidenceNote: "Recibo 45 na secretaria",
      grossCents: 123456,
      method: "CASH",
      nature: "VALIDATED",
      occurredOn: new Date().toLocaleDateString("en-CA"),
      unitId: 2,
    })
    await expect(rowOf(page, "Recibo 45 na secretaria")).toContainText(brl("1.234,56"))
  })

  test("regularizes a confirmed enrollment with no obligation yet", async ({ page }) => {
    await mockEnrollmentApi(page)
    const { calls } = await mockFinanceLedgerApi(page, { noObligation: true })
    await signInAndOpen(page, "/administration/enrollments/502")

    await page.getByRole("button", { name: "Ações da matrícula" }).click()
    await page.getByRole("menuitem", { name: "Regularizar financeiro" }).click()
    const dialog = page.getByRole("dialog", { name: "Regularizar o financeiro · Bruno Lima" })
    // With no financial guardian, the adult student answers for it.
    await expect(dialog.getByRole("combobox", { name: /^Responsável financeiro/ })).toBeVisible()
    await dialog.getByRole("textbox", { name: /^Saldo devido/ }).fill("1000")
    await dialog.getByRole("textbox", { name: /^Parcelas/ }).fill("3")
    const due = new Date()
    due.setDate(due.getDate() + 10)
    await dialog.getByRole("textbox", { name: /^Primeiro vencimento/ }).fill(due.toLocaleDateString("pt-BR"))
    await dialog.getByRole("textbox", { name: /^O que foi conferido/ }).fill("Contrato de 2027, nada emitido")
    await dialog.getByRole("button", { name: "Regularizar" }).click()

    await expect(page.getByText("Financeiro regularizado.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Parcela 1 · Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Obrigação" })).toContainText("Regularização")
    expect(lastCall(calls, "POST", "/api/finance/obligations/regularize")?.body).toMatchObject({
      basis: "Contrato de 2027, nada emitido",
      enrollmentId: 502,
      installments: 3,
      partyPersonId: 202,
      totalCents: 100000,
    })
  })

  test("lets the Secretaria read an installment without its payments", async ({ page }) => {
    await mockEnrollmentApi(page, { readOnly: true })
    await mockFinanceLedgerApi(page, { readOnly: true })
    const caucaia = {
      ...secretariaContext,
      assignments: [{ ...secretariaContext.assignments[0], unitId: 2, unitName: "Unidade Caucaia" }],
    }
    await signInAndOpen(page, `${tuitionPath}/702`, caucaia)

    await expect(page.getByRole("heading", { level: 1, name: /^Parcela 2/ })).toBeVisible()
    await expect(page.getByRole("region", { name: "Pagamentos" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Registrar pagamento" })).toHaveCount(0)
  })
})
