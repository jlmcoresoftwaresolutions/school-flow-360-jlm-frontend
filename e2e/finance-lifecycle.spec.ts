import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The financial side of a lifecycle event (EPIC 8, Fatias 2 and 4): a cancellation's cut, with the decision
// on the installment that crosses it, and the review of a transfer whose conditions changed. The backend is
// mocked (e2e/support/enrollments.ts); the signed-in user is an Admin unless a test says otherwise. Bruno Lima
// has an active enrollment (502) in Unidade Caucaia.

const brunoPath = "/administration/enrollments/502"

const pick = async (page: Page, scope: Locator | Page, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const chooseAction = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Ações da matrícula" }).click()
  await page.getByRole("menuitem", { name }).click()
}

const prepareCancellation = async (page: Page) => {
  await chooseAction(page, "Cancelar matrícula")
  const dialog = page.getByRole("dialog", { name: "Cancelar a matrícula de Bruno Lima" })
  await pick(page, dialog, /^Motivo/, "Saída da instituição")
  await dialog.getByRole("button", { name: "Preparar" }).click()
  await expect(page).toHaveURL(/\/events\/41$/)
}

test.describe("financial side of the lifecycle events", () => {
  test("decides the installment that crosses a cancellation's cut, then confirms", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { cancellationObligation: true, publishedTexts: true })
    await signInAndOpen(page, brunoPath)
    await prepareCancellation(page)

    const blockers = page.getByRole("list", { name: "O que impede a confirmação" })
    await expect(blockers).toContainText("O Financeiro ainda precisa decidir sobre as parcelas deste evento.")
    await expect(page.getByRole("button", { name: "Confirmar Cancelamento" })).toBeDisabled()

    const cut = page.getByRole("region", { name: "Parte financeira do cancelamento" })
    await expect(cut.getByRole("row").filter({ hasText: "Parcela 1" })).toContainText("Continua exigível")
    await expect(cut.getByRole("row").filter({ hasText: "Parcela 2" })).toContainText("Precisa de decisão")
    await expect(cut.getByRole("row").filter({ hasText: "Parcela 3" })).toContainText("Será cancelada")
    await expect(cut).toContainText("Há parcela aguardando a sua decisão.")

    await cut.getByRole("button", { name: "Decidir a parcela 2" }).click()
    const dialog = page.getByRole("dialog", { name: "Decidir a parcela 2" })
    await dialog.getByRole("button", { name: "Decidir" }).click()
    await expect(dialog.getByText("Escolha a decisão.")).toBeVisible()
    await pick(page, dialog, /^Decisão/, "Cancelar a parcela")
    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Mês sem aulas por causa da saída")
    await dialog.getByRole("button", { name: "Decidir" }).click()

    await expect(page.getByText("Decisão registrada.")).toBeVisible()
    await expect(cut.getByRole("row").filter({ hasText: "Parcela 2" })).toContainText(
      "Mês sem aulas por causa da saída",
    )
    const sent = lastCall(calls, "POST", "/api/finance/lifecycle-events/41/cut-decisions")?.body as Record<
      string,
      unknown
    >
    expect(sent).toMatchObject({ outcome: "CANCEL", reason: "Mês sem aulas por causa da saída", titleId: 702 })
    expect(String(sent.intent)).not.toHaveLength(0)

    await expect(blockers).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Confirmar Cancelamento" })).toBeEnabled()
  })

  test("lets the Secretaria read the cut without deciding it", async ({ page }) => {
    await mockEnrollmentApi(page, { cancellationObligation: true })
    // A Secretaria of Unidade Caucaia, Bruno's unit, who prepares the cancellation.
    const caucaia = {
      ...secretariaContext,
      assignments: [{ ...secretariaContext.assignments[0], unitId: 2, unitName: "Unidade Caucaia" }],
    }
    await signInAndOpen(page, brunoPath, caucaia)
    await prepareCancellation(page)

    const cut = page.getByRole("region", { name: "Parte financeira do cancelamento" })
    await expect(cut).toContainText("Há parcela aguardando a decisão do Financeiro.")
    await expect(cut.getByRole("button", { name: /^Decidir/ })).toHaveCount(0)
  })

  test("records the financial review of a transfer whose conditions changed", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { transferNeedsReview: true })
    await signInAndOpen(page, brunoPath)
    await chooseAction(page, "Transferir para outra unidade")
    const prepare = page.getByRole("dialog", { name: "Transferir Bruno Lima" })
    await pick(page, prepare, /^Motivo/, "Mudança de endereço")
    await pick(page, prepare, /^Unidade de destino/, "Unidade Aldeota")
    await prepare.getByRole("button", { name: "Preparar" }).click()

    const finance = page.getByRole("region", { exact: true, name: "Parte financeira" })
    await expect(finance).toContainText("o Financeiro precisa registrar a revisão antes da confirmação")
    await finance.getByRole("button", { name: "Registrar revisão" }).click()
    const dialog = page.getByRole("dialog", { name: "Registrar a revisão financeira da transferência" })
    await dialog.getByRole("button", { name: "Registrar" }).click()
    await expect(dialog.getByText("Informe o motivo (de 3 a 300 caracteres).")).toBeVisible()
    await dialog.getByRole("textbox", { name: /^O que foi conferido/ }).fill("Mesmo plano, outro pagador")
    await dialog.getByRole("button", { name: "Registrar" }).click()

    await expect(page.getByText("Revisão registrada.")).toBeVisible()
    await expect(finance).toContainText("O Financeiro registrou a revisão.")
    expect(lastCall(calls, "POST", "/api/finance/lifecycle-events/41/transfer-review")?.body).toMatchObject({
      reason: "Mesmo plano, outro pagador",
    })
    await expect(page.getByRole("list", { name: "O que impede a confirmação" })).not.toContainText(
      "O Financeiro ainda precisa decidir",
    )
  })

  test("shows no financial side for an event without an obligation", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)
    await prepareCancellation(page)

    await expect(page.getByRole("heading", { level: 1, name: "Cancelamento · Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Parte financeira do cancelamento" })).toHaveCount(0)
  })
})
