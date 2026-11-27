import type { Locator } from "@playwright/test"

import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The policies the lifecycle events read (EPIC 7, Fatia H): the lock's maximum per unit and stage, the "no
// financial effect" rule per unit, offer and event type, and the notifications' text. Only the Admin
// publishes. The backend is mocked (e2e/support/enrollments.ts) and keeps what is published; the signed-in
// user is an Admin unless a test says otherwise.

const policiesPath = "/administration/lifecycle-policies"

const pick = async (page: Page, scope: Locator | Page, label: RegExp, option: string) => {
  await scope.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

const rowOf = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

test.describe("lifecycle policies", () => {
  test("publishes and withdraws a unit's lock limit per stage", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, "/home")
    await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Políticas de eventos" }).click()

    await expect(page).toHaveURL(new RegExp(`${policiesPath}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Políticas de eventos" })).toBeVisible()
    const row = rowOf(page, "Ensino Fundamental")
    await expect(row).toContainText("Nada publicado")
    await expect(row).toContainText("o trancamento fica bloqueado")

    await page.getByRole("button", { name: "Ações de Ensino Fundamental" }).click()
    await page.getByRole("menuitem", { name: "Publicar" }).click()
    const dialog = page.getByRole("dialog", { name: "Publicar o limite de trancamento" })
    await dialog.getByRole("textbox", { name: /^Limite de dias/ }).fill("0")
    await dialog.getByRole("button", { name: "Publicar" }).click()
    await expect(dialog.getByText("Informe de 1 a 366 dias.")).toBeVisible()
    await dialog.getByRole("textbox", { name: /^Limite de dias/ }).fill("30")
    await dialog.getByRole("textbox", { name: /^Observação/ }).fill("Só para EJA")
    await dialog.getByRole("button", { name: "Publicar" }).click()

    await expect(page.getByText("Política publicada.")).toBeVisible()
    await expect(row).toContainText("30 dias")
    await expect(row).toContainText("Publicada")
    expect(lastCall(calls, "PUT", "/api/lifecycle-policies/lock")?.body).toEqual({
      maxDays: 30,
      note: "Só para EJA",
      stageId: 2,
      unitId: 1,
    })

    await page.getByRole("button", { name: "Ações de Ensino Fundamental" }).click()
    await page.getByRole("menuitem", { name: "Retirar" }).click()
    await page
      .getByRole("dialog", { name: "Retirar o limite de trancamento?" })
      .getByRole("button", { name: "Retirar" })
      .click()
    await expect(page.getByText("Política retirada.")).toBeVisible()
    await expect(row).toContainText("Retirada")
  })

  test("publishes a no-financial-effect rule for one offer of a unit", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, policiesPath)

    await page.getByRole("tab", { name: "Sem efeito financeiro" }).click()
    await expect(page.getByText("Nenhuma regra publicada")).toBeVisible()
    await page.getByRole("button", { name: "Nova regra" }).click()
    const dialog = page.getByRole("dialog", { name: "Publicar regra sem efeito financeiro" })
    await dialog.getByRole("button", { name: "Publicar" }).click()
    await expect(dialog.getByText("Escolha o evento.")).toBeVisible()
    await expect(dialog.getByText("Informe a referência da regra.")).toBeVisible()

    await pick(page, dialog, /^Evento/, "Cancelamento")
    await pick(page, dialog, /^Alcance/, "1º ano · Ano letivo 2027")
    await dialog.getByRole("textbox", { name: /^Referência da regra/ }).fill("Ata 3/2026")
    await dialog.getByRole("textbox", { name: /^Evidência/ }).fill("Oferta gratuita, sem mensalidade")
    await dialog.getByRole("button", { name: "Publicar" }).click()

    await expect(page.getByText("Política publicada.")).toBeVisible()
    const row = rowOf(page, "Ata 3/2026")
    await expect(row).toContainText("Cancelamento")
    await expect(row).toContainText("1º ano · Ano letivo 2027")
    await expect(row).toContainText("Publicada")
    expect(lastCall(calls, "PUT", "/api/lifecycle-policies/financial-no-effect")?.body).toEqual({
      eventType: "CANCELLATION",
      evidence: "Oferta gratuita, sem mensalidade",
      offerId: 31,
      ruleRef: "Ata 3/2026",
      unitId: 1,
    })
  })

  test("edits a notification's text, refusing a field that doesn't exist", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page)
    await signInAndOpen(page, policiesPath)

    await page.getByRole("tab", { name: "Textos dos avisos" }).click()
    await expect(rowOf(page, "Retomada do trancamento")).toBeVisible()
    await page.getByRole("button", { name: "Editar o texto de Cancelamento" }).click()
    const dialog = page.getByRole("dialog", { name: "Texto do aviso · Cancelamento" })
    const text = dialog.getByRole("textbox", { name: /^Texto/ })
    await text.fill("Valor: {{tuition.amount}}")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(dialog.getByText("O texto usa um campo que não existe ou passou do limite.")).toBeVisible()

    await text.fill("A matrícula de {{student.name}} foi cancelada em {{event.date}}.")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Texto salvo.")).toBeVisible()
    await expect(rowOf(page, "Cancelamento")).toContainText("foi cancelada em")
    expect(lastCall(calls, "PUT", "/api/lifecycle-policies/notification-templates/CANCELLATION")?.body).toMatchObject({
      body: "A matrícula de {{student.name}} foi cancelada em {{event.date}}.",
      version: 0,
    })
  })

  test("lets the Secretaria read the policies, without changing them", async ({ page }) => {
    await mockEnrollmentApi(page, { readOnly: true })
    await signInAndOpen(page, policiesPath, secretariaContext)

    await expect(rowOf(page, "Ensino Fundamental")).toContainText("Nada publicado")
    await expect(page.getByText("Você pode consultar as políticas. Só o Admin publica e retira.")).toBeVisible()
    await expect(page.getByRole("button", { name: /^Ações de/ })).toHaveCount(0)
    await page.getByRole("tab", { name: "Textos dos avisos" }).click()
    await expect(page.getByRole("button", { name: /^Editar o texto/ })).toHaveCount(0)
  })
})
