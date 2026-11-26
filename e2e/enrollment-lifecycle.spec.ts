import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The lifecycle events of an enrollment (EPIC 7, foundation): preparing a transfer, a re-enrollment, a
// cancellation or a lock from a confirmed enrollment, the event's page with what still stops the
// confirmation, the destination preparation, giving an event up and recovering a lost answer by the
// intent. Nothing is confirmed. The backend is mocked (e2e/support/enrollments.ts); the signed-in user is
// an Admin unless a test says otherwise. Bruno Lima has an active enrollment (502) in Unidade Caucaia.

const brunoPath = "/administration/enrollments/502"

// Someone with a single role in Unidade Aldeota.
const withRole = (role: string) => ({
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role }],
  roles: [role],
})

// Picks an option of a select inside `scope` (the page or a dialog); the options open in a portal.
const pick = async (page: Page, scope: Locator | Page, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const chooseAction = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Ações da matrícula" }).click()
  await page.getByRole("menuitem", { name }).click()
}

const prepareTransfer = async (page: Page) => {
  await chooseAction(page, "Transferir para outra unidade")
  const dialog = page.getByRole("dialog", { name: "Transferir Bruno Lima" })
  await pick(page, dialog, /^Motivo/, "Mudança de endereço")
  await pick(page, dialog, /^Unidade de destino/, "Unidade Aldeota")
  await dialog.getByRole("button", { name: "Preparar" }).click()
}

test.describe("enrollment lifecycle events", () => {
  test("prepares a transfer that changes nothing and shows what blocks its confirmation", async ({ page }) => {
    const { calls, records } = await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Transferir para outra unidade")
    const dialog = page.getByRole("dialog", { name: "Transferir Bruno Lima" })
    await expect(dialog).toContainText("Preparar não muda a matrícula atual nem reserva vaga.")
    await dialog.getByRole("button", { name: "Preparar" }).click()
    await expect(dialog).toContainText("Escolha o motivo.")
    await expect(dialog).toContainText("Escolha a unidade de destino.")

    await pick(page, dialog, /^Motivo/, "Mudança de endereço")
    // The destination is another unit: the origin's own isn't offered.
    await dialog.getByRole("combobox", { name: /^Unidade de destino/ }).click()
    await expect(page.getByRole("option", { name: "Unidade Caucaia" })).toHaveCount(0)
    await page.getByRole("option", { exact: true, name: "Unidade Aldeota" }).click()
    await dialog.getByRole("button", { name: "Preparar" }).click()

    await expect(page).toHaveURL(/\/administration\/enrollments\/events\/41$/)
    await expect(page.getByRole("heading", { level: 1, name: "Transferência · Bruno Lima" })).toBeVisible()
    await expect(page.getByText("Em preparação", { exact: true }).first()).toBeVisible()
    const sent = lastCall(calls, "POST", "/api/lifecycle-events")?.body as Record<string, unknown>
    expect(sent).toMatchObject({
      destinationUnitId: 1,
      eventType: "TRANSFER",
      originEnrollmentId: 502,
      reasonCode: "ADDRESS_CHANGE",
    })
    expect(String(sent.intent)).not.toHaveLength(0)

    const blockers = page.getByRole("list", { name: "O que impede a confirmação" })
    await expect(blockers).toContainText("Escolha a turma na preparação de destino.")
    await expect(blockers).toContainText("A parte financeira deste evento ainda não está disponível.")
    await expect(blockers).not.toContainText("backend text")

    const origin = page.getByRole("region", { name: "Matrícula atual" })
    await expect(origin).toContainText("2027-000041")
    await expect(origin).toContainText("Ativa")
    const destination = page.getByRole("region", { name: "Preparação de destino" })
    await expect(destination).toContainText("Unidade Aldeota")
    await expect(destination).toContainText("Nenhuma turma escolhida")
    await expect(page.getByRole("region", { name: "O que muda ao confirmar" })).toContainText("Antes da confirmação")
    // The origin stays as it is.
    expect(records.get(502)?.status).toBe("ACTIVE")

    // The destination preparation is a normal enrollment in preparation, of the transfer kind.
    await destination.getByRole("link", { name: "Abrir preparação" }).click()
    await expect(page.getByRole("note")).toContainText("Preparação de destino de um evento: Transferência")
    await expect(page.getByText("Em preparação", { exact: true }).first()).toBeVisible()
  })

  test("marks the origin with the open event, without offering another one", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)
    await expect(page).toHaveURL(/\/events\/41$/)

    await page.getByRole("region", { name: "Matrícula atual" }).getByRole("link", { name: "Abrir matrícula" }).click()
    await expect(page.getByRole("note")).toContainText("Transferência em preparação")
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toHaveCount(0)

    await page.getByRole("tab", { name: "Histórico" }).click()
    const row = page.getByRole("row").filter({ hasText: "Transferência preparada" })
    await expect(row).toContainText("Motivo: Mudança de endereço")
    await row.getByRole("link", { name: "Abrir evento" }).click()
    await expect(page).toHaveURL(/\/events\/41$/)
  })

  test("asks a justification for the reason Outro", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Cancelar matrícula")
    const dialog = page.getByRole("dialog", { name: "Cancelar a matrícula de Bruno Lima" })
    await expect(dialog.getByRole("combobox", { name: /^Unidade de destino/ })).toHaveCount(0)
    await pick(page, dialog, /^Motivo/, "Outro")
    await dialog.getByRole("button", { name: "Preparar" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Justificativa/ })).toHaveAccessibleDescription(
      "Este motivo pede uma justificativa.",
    )

    await dialog.getByRole("textbox", { name: /^Justificativa/ }).fill("A família pediu por telefone")
    await dialog.getByRole("button", { name: "Preparar" }).click()

    await expect(page.getByRole("heading", { level: 1, name: "Cancelamento · Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Evento" })).toContainText("A família pediu por telefone")
    // A cancellation has no destination preparation.
    await expect(page.getByRole("region", { name: "Preparação de destino" })).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/lifecycle-events")?.body).toMatchObject({
      eventType: "CANCELLATION",
      justification: "A família pediu por telefone",
      reasonCode: "OTHER",
    })
  })

  test("shows a lock as blocked by its undefined rules", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Trancar matrícula")
    const dialog = page.getByRole("dialog", { name: "Trancar a matrícula de Bruno Lima" })
    await pick(page, dialog, /^Motivo/, "Impedimento temporário")
    await dialog.getByRole("button", { name: "Preparar" }).click()

    await expect(page.getByRole("list", { name: "O que impede a confirmação" })).toContainText(
      "As regras do trancamento (vaga, prazo, cobrança e retorno) ainda estão sendo definidas.",
    )
  })

  test("gives an event up with its destination preparation, leaving the enrollment as it was", async ({ page }) => {
    const { calls, records } = await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)
    await expect(page).toHaveURL(/\/events\/41$/)

    await page.getByRole("button", { name: "Ações do evento" }).click()
    await page.getByRole("menuitem", { name: "Abandonar evento" }).click()
    const dialog = page.getByRole("dialog", { name: "Abandonar o evento (Transferência)?" })
    await expect(dialog).toContainText("O evento e a preparação de destino ficam no histórico como abandonados.")
    await dialog.getByRole("button", { name: "Abandonar" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveAccessibleDescription("Informe o motivo.")
    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("A família desistiu da mudança")
    await dialog.getByRole("button", { name: "Abandonar" }).click()

    await expect(page.getByText("Abandonado", { exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "Confirmação" })).toContainText("A família desistiu da mudança")
    await expect(page.getByRole("button", { name: "Ações do evento" })).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/lifecycle-events/41/abandon")?.body).toEqual({
      reason: "A família desistiu da mudança",
      version: 0,
    })
    expect(records.get(502)?.status).toBe("ACTIVE")
    expect(records.get(600)?.status).toBe("ABANDONED")

    // The enrollment may prepare another event again.
    await page.goto(brunoPath)
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toBeVisible()
    await expect(page.getByRole("note")).toHaveCount(0)
  })

  test("recovers by the intent an event whose answer was lost", async ({ page }) => {
    const { calls, lifecycle } = await mockEnrollmentApi(page, { losePrepareAnswer: true })
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)

    await expect(page).toHaveURL(/\/events\/41$/)
    const sent = lastCall(calls, "POST", "/api/lifecycle-events")?.body as Record<string, unknown>
    expect(calls.some((call) => call.path === `/api/lifecycle-events/by-intent/${String(sent.intent)}`)).toBe(true)
    expect(lifecycle.size).toBe(1)
  })

  test("offers no event to whoever only reads", async ({ page }) => {
    await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, brunoPath, withRole("COORDENACAO"))

    await expect(page.getByRole("heading", { level: 1, name: "Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toHaveCount(0)
  })

  test("offers no event to a Secretaria on an enrollment of a unit it doesn't operate", async ({ page }) => {
    await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath, secretariaContext)

    await expect(page.getByRole("heading", { level: 1, name: "Bruno Lima" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Ações da matrícula" })).toHaveCount(0)
  })
})
