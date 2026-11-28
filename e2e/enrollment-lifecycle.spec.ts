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
    await expect(blockers).toContainText("A escola ainda não publicou a parte financeira deste evento")
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

  test("asks a lock's days and shows it blocked while the unit has no lock limit", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Trancar matrícula")
    const dialog = page.getByRole("dialog", { name: "Trancar a matrícula de Bruno Lima" })
    await pick(page, dialog, /^Motivo/, "Impedimento temporário")
    await dialog.getByRole("button", { name: "Preparar" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Dias de trancamento/ })).toHaveAccessibleDescription(
      "Informe de 1 a 366 dias.",
    )
    await dialog.getByRole("textbox", { name: /^Dias de trancamento/ }).fill("20")
    await dialog.getByRole("button", { name: "Preparar" }).click()

    await expect(page.getByRole("list", { name: "O que impede a confirmação" })).toContainText(
      "A unidade ainda não publicou o limite de trancamento desta etapa.",
    )
    await expect(page.getByRole("region", { name: "Evento" })).toContainText("20 dias")
    expect(lastCall(calls, "POST", "/api/lifecycle-events")?.body).toMatchObject({ eventType: "LOCK", lockDays: 20 })
  })

  test("confirms a cancellation once nothing blocks it, with what comes after", async ({ page }) => {
    const { calls, records } = await mockEnrollmentApi(page, { noEffectUnits: [2], publishedTexts: true })
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Cancelar matrícula")
    const prepare = page.getByRole("dialog", { name: "Cancelar a matrícula de Bruno Lima" })
    await expect(prepare.getByRole("textbox", { name: /^Data efetiva/ })).toBeVisible()
    await pick(page, prepare, /^Motivo/, "Saída da instituição")
    await prepare.getByRole("button", { name: "Preparar" }).click()

    await expect(page.getByText("Nada impede a confirmação.")).toBeVisible()
    await expect(page.getByRole("region", { name: "Evento" })).toContainText(
      `O dia da confirmação (${new Date().toLocaleDateString("pt-BR")}, se confirmado hoje)`,
    )
    await page.getByRole("button", { name: "Confirmar Cancelamento" }).click()
    const dialog = page.getByRole("dialog", { name: "Confirmar Cancelamento?" })
    await expect(dialog).toContainText("A matrícula fica cancelada e a vaga é liberada.")
    await dialog.getByRole("button", { name: "Confirmar" }).click()

    await expect(page.getByText("Cancelamento confirmada.")).toBeVisible()
    await expect(page.getByText("Confirmado", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar Cancelamento" })).toHaveCount(0)
    const sent = lastCall(calls, "POST", "/api/lifecycle-events/41/confirm")?.body as Record<string, unknown>
    expect(sent.version).toBe(0)
    expect(String(sent.intent)).not.toHaveLength(0)
    expect(records.get(502)?.status).toBe("CANCELLED")

    // The diary waits for its module; one notice went out, the other had no e-mail and is sent again.
    const after = page.getByRole("region", { name: "Depois da confirmação" })
    await expect(after.getByRole("row").filter({ hasText: "Diário de classe" })).toContainText("Pendente")
    const failed = after.getByRole("row").filter({ hasText: "Sem e-mail cadastrado." })
    await expect(failed).toContainText("Falhou")
    await failed.getByRole("button", { name: "Reenviar" }).click()
    await expect(page.getByText("Aviso reenviado.")).toBeVisible()
    await expect(failed).toContainText("2 tentativas")

    // The Admin reprocesses only what failed, saying why.
    await after.getByRole("button", { name: "Reprocessar" }).click()
    const reprocess = page.getByRole("dialog", { name: "Reprocessar o que falhou?" })
    await reprocess.getByRole("button", { name: "Reprocessar" }).click()
    await expect(reprocess.getByText("Informe o motivo (pelo menos 3 caracteres).")).toBeVisible()
    await reprocess.getByRole("textbox", { name: /^Motivo/ }).fill("E-mail do responsável corrigido")
    await reprocess.getByRole("button", { name: "Reprocessar" }).click()
    await expect(page.getByText("O que falhou foi enviado de novo.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/lifecycle-events/41/reprocess")?.body).toEqual({
      reason: "E-mail do responsável corrigido",
    })

    // The enrollment shows the confirmation in its history.
    await page.goto(brunoPath)
    await expect(page.getByText("Cancelada", { exact: true }).first()).toBeVisible()
    await page.getByRole("tab", { name: "Histórico" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Cancelamento confirmado" })).toContainText(
      "Motivo: Saída da instituição",
    )
  })

  test("prepares a cancellation for a later day, confirmed only on that day", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { noEffectUnits: [2] })
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Cancelar matrícula")
    const prepare = page.getByRole("dialog", { name: "Cancelar a matrícula de Bruno Lima" })
    await pick(page, prepare, /^Motivo/, "Saída da instituição")
    const later = new Date()
    later.setDate(later.getDate() + 5)
    await prepare.getByRole("textbox", { name: /^Data efetiva/ }).fill(later.toLocaleDateString("pt-BR"))
    await prepare.getByRole("button", { name: "Preparar" }).click()

    const blockers = page.getByRole("list", { name: "O que impede a confirmação" })
    await expect(blockers).toContainText("O cancelamento só é confirmado no dia da data efetiva.")
    // The school hasn't published the notice's text yet either.
    await expect(blockers).toContainText("O Admin ainda não publicou o texto do aviso deste tipo de evento")
    await expect(page.getByRole("button", { name: "Confirmar Cancelamento" })).toBeDisabled()
    expect(lastCall(calls, "POST", "/api/lifecycle-events")?.body).toMatchObject({
      effectiveDate: later.toLocaleDateString("en-CA"),
    })
  })

  test("corrects an event's reason as a new fact and exports its evidence", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)
    await expect(page).toHaveURL(/\/events\/41$/)

    await page.getByRole("button", { name: "Ações do evento" }).click()
    await page.getByRole("menuitem", { name: "Corrigir motivo ou justificativa" }).click()
    const dialog = page.getByRole("dialog", { name: "Corrigir o evento" })
    await expect(dialog).toContainText("Motivo atual: Mudança de endereço")
    await dialog.getByRole("button", { name: "Corrigir" }).click()
    await expect(dialog.getByText("Escolha o novo motivo.")).toBeVisible()
    await pick(page, dialog, /^Novo motivo/, "Necessidade pedagógica")
    await dialog.getByRole("textbox", { name: /^Por que corrigir/ }).fill("Motivo registrado errado")
    await dialog.getByRole("button", { name: "Corrigir" }).click()

    await expect(page.getByText("Correção registrada.")).toBeVisible()
    const corrections = page.getByRole("region", { name: "Correções" })
    await expect(corrections).toContainText("Mudança de endereço")
    await expect(corrections).toContainText("Necessidade pedagógica")
    await expect(corrections).toContainText("Motivo registrado errado")
    expect(lastCall(calls, "POST", "/api/lifecycle-events/41/rectify")?.body).toEqual({
      field: "REASON",
      newValue: "PEDAGOGICAL_NEED",
      reason: "Motivo registrado errado",
    })

    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Ações do evento" }).click()
    await page.getByRole("menuitem", { name: "Exportar evidência" }).click()
    expect((await download).suggestedFilename()).toBe("evidencia-evento-41.json")
  })

  test("confirms a lock within the unit's limit and returns it later", async ({ page }) => {
    const { calls, records } = await mockEnrollmentApi(page, {
      lockPolicyUnits: { 2: 30 },
      noEffectUnits: [2],
      publishedTexts: true,
    })
    await signInAndOpen(page, brunoPath)

    await chooseAction(page, "Trancar matrícula")
    const prepare = page.getByRole("dialog", { name: "Trancar a matrícula de Bruno Lima" })
    await pick(page, prepare, /^Motivo/, "Impedimento temporário")
    await prepare.getByRole("textbox", { name: /^Dias de trancamento/ }).fill("45")
    await prepare.getByRole("button", { name: "Preparar" }).click()
    await expect(page.getByRole("list", { name: "O que impede a confirmação" })).toContainText(
      "Os dias pedidos passam do limite de trancamento",
    )
    await expect(page.getByRole("button", { name: "Confirmar Trancamento" })).toBeDisabled()

    // Given up and prepared again within the limit.
    await page.getByRole("button", { name: "Ações do evento" }).click()
    await page.getByRole("menuitem", { name: "Abandonar evento" }).click()
    const abandon = page.getByRole("dialog", { name: /^Abandonar o evento/ })
    await abandon.getByRole("textbox", { name: /^Motivo/ }).fill("Dias errados")
    await abandon.getByRole("button", { name: "Abandonar" }).click()
    await expect(page.getByText("Abandonado", { exact: true })).toBeVisible()
    await page.goto(brunoPath)
    await chooseAction(page, "Trancar matrícula")
    const again = page.getByRole("dialog", { name: "Trancar a matrícula de Bruno Lima" })
    await pick(page, again, /^Motivo/, "Impedimento temporário")
    await again.getByRole("textbox", { name: /^Dias de trancamento/ }).fill("20")
    await again.getByRole("button", { name: "Preparar" }).click()

    await page.getByRole("button", { name: "Confirmar Trancamento" }).click()
    await page
      .getByRole("dialog", { name: "Confirmar Trancamento?" })
      .getByRole("button", { name: "Confirmar" })
      .click()
    await expect(page.getByText("Trancamento confirmada.")).toBeVisible()
    expect(records.get(502)?.status).toBe("LOCKED")
    await expect(page.getByRole("region", { exact: true, name: "Confirmação" })).toContainText("Ainda não retomado")

    // The return records when the family asked and the attendance's reference.
    await page.getByRole("button", { name: "Retomar matrícula" }).click()
    const giveBack = page.getByRole("dialog", { name: "Retomar a matrícula trancada?" })
    await giveBack.getByRole("button", { name: "Retomar" }).click()
    await expect(giveBack.getByText("Informe a data do pedido.")).toBeVisible()
    await expect(giveBack.getByText("Informe a referência do atendimento.")).toBeVisible()
    const asked = new Date().toLocaleDateString("pt-BR")
    await giveBack.getByRole("textbox", { name: /^Data do pedido/ }).fill(asked)
    await giveBack.getByRole("textbox", { name: /^Referência do atendimento/ }).fill("Atendimento 2026-77")
    await giveBack.getByRole("button", { name: "Retomar" }).click()
    await expect(page.getByText("Matrícula retomada.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/lifecycle-events/42/return")?.body).toMatchObject({
      attendanceRef: "Atendimento 2026-77",
      requestedOn: new Date().toLocaleDateString("en-CA"),
    })
    await expect(page.getByRole("region", { exact: true, name: "Confirmação" })).toContainText("Atendimento 2026-77")
    expect(records.get(502)?.status).toBe("ACTIVE")
    await expect(page.getByRole("button", { name: "Retomar matrícula" })).toHaveCount(0)
  })

  test("leaves a lock's confirmation to the Admin", async ({ page }) => {
    await mockEnrollmentApi(page, { lockPolicyUnits: { 2: 30 }, noEffectUnits: [2], publishedTexts: true })
    // A Secretaria of Unidade Caucaia, Bruno's unit, who prepares the lock but doesn't confirm it.
    const caucaia = {
      ...secretariaContext,
      assignments: [{ ...secretariaContext.assignments[0], unitId: 2, unitName: "Unidade Caucaia" }],
    }
    await signInAndOpen(page, brunoPath, caucaia)

    await chooseAction(page, "Trancar matrícula")
    const prepare = page.getByRole("dialog", { name: "Trancar a matrícula de Bruno Lima" })
    await pick(page, prepare, /^Motivo/, "Impedimento temporário")
    await prepare.getByRole("textbox", { name: /^Dias de trancamento/ }).fill("20")
    await prepare.getByRole("button", { name: "Preparar" }).click()

    await expect(page.getByText("Nada impede a confirmação, mas este evento é confirmado só pelo Admin.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar Trancamento" })).toHaveCount(0)
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
    await expect(page.getByRole("region", { exact: true, name: "Confirmação" })).toContainText(
      "A família desistiu da mudança",
    )
    // Only the Admin's evidence is left: an abandoned event is neither given up again nor corrected.
    await page.getByRole("button", { name: "Ações do evento" }).click()
    await expect(page.getByRole("menuitem", { name: "Exportar evidência" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Abandonar evento" })).toHaveCount(0)
    await expect(page.getByRole("menuitem", { name: "Corrigir motivo ou justificativa" })).toHaveCount(0)
    await page.keyboard.press("Escape")
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

  test("authorizes a seat above the limit of a full destination class, in a unit that enabled it", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { capacityEnabledUnits: [1], destinationFull: true })
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)
    await expect(page).toHaveURL(/\/events\/41$/)

    const blockers = page.getByRole("list", { name: "O que impede a confirmação" })
    await expect(blockers).toContainText("A turma de destino não tem vaga.")
    const capacity = page.getByRole("region", { name: "Vaga acima do limite" })
    await expect(capacity).toContainText("A turma de destino está cheia.")

    await capacity.getByRole("button", { name: "Autorizar vaga extra" }).click()
    const dialog = page.getByRole("dialog", { name: "Autorizar uma vaga acima do limite?" })
    await expect(dialog).toContainText("por 24 horas")
    await dialog.getByRole("button", { name: "Autorizar vaga extra" }).click()
    await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveAccessibleDescription("Informe o motivo.")
    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Irmão já estuda na turma")
    await dialog.getByRole("button", { name: "Autorizar vaga extra" }).click()

    await expect(page.getByText("Vaga extra autorizada por 24 horas.")).toBeVisible()
    await expect(capacity).toContainText("Disponível")
    await expect(capacity).toContainText("Irmão já estuda na turma")
    await expect(capacity.getByRole("button", { name: "Autorizar vaga extra" })).toHaveCount(0)
    await expect(blockers).not.toContainText("A turma de destino não tem vaga.")
    expect(lastCall(calls, "POST", "/api/lifecycle-events/41/capacity-exception")?.body).toEqual({
      reason: "Irmão já estuda na turma",
    })
  })

  test("offers no extra seat where the destination unit didn't enable the exception", async ({ page }) => {
    await mockEnrollmentApi(page, { destinationFull: true })
    await signInAndOpen(page, brunoPath)
    await prepareTransfer(page)

    const capacity = page.getByRole("region", { name: "Vaga acima do limite" })
    await expect(capacity).toContainText("A unidade de destino não habilitou a exceção de lotação")
    await expect(capacity.getByRole("button", { name: "Autorizar vaga extra" })).toHaveCount(0)
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
