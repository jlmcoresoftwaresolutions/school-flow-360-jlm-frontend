import { expect, type Page, test } from "./support/test.ts"
import { lastCall, mockUserAccessApi, signInAndOpen } from "./support/userAccess.ts"

const invitesPath = "/users/invites"

const rowOf = (page: Page, text: string) => page.getByRole("table").getByRole("row").filter({ hasText: text })

const openActions = async (page: Page, email: string) => {
  await rowOf(page, email)
    .getByRole("button", { name: `Ações do convite de ${email}` })
    .click()
}

test.describe("invitations", () => {
  test("shows where each invitation stands, without offering an old link for reuse", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)

    await expect(page.getByRole("heading", { level: 1, name: "Convites" })).toBeVisible()

    const pending = rowOf(page, "ana.lima@horizonte.edu.br")
    await expect(pending).toContainText("Pendente")
    await expect(pending).toContainText("E-mail enviado")
    await expect(pending).toContainText(/Vence em/)
    await expect(pending).toContainText("Professor · Unidade Caucaia")

    const failed = rowOf(page, "bruno@horizonte.edu.br")
    await expect(failed).toContainText("O e-mail não pôde ser enviado")
    await expect(failed).toContainText("Nome não informado")
    await expect(failed).toContainText("Cadastro manual")

    const expired = rowOf(page, "carla@horizonte.edu.br")
    await expect(expired).toContainText("Vencido")
    await expect(expired).toContainText("Reenvie para mandar um novo link.")
    await expect(expired).toContainText("Aluno · Unidade Benfica (inativa)")

    await expect(rowOf(page, "pedro.lima@horizonte.edu.br")).toContainText(/Aceito em/)

    // Nothing here edits the validity: it is the system's 48 h.
    await expect(page.getByRole("textbox", { name: /Validade/ })).toHaveCount(0)
    expect(lastCall(calls, "GET", "/api/invitations")?.query).toMatchObject({ direction: "desc", sortBy: "createdAt" })
  })

  test("only lets a pending or expired invitation be resent, and only a pending one be cancelled", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)

    await openActions(page, "pedro.lima@horizonte.edu.br")
    await expect(page.getByRole("menuitem", { name: "Reenviar" })).toBeDisabled()
    await expect(page.getByRole("menuitem", { name: "Cancelar convite" })).toBeDisabled()
    await page.keyboard.press("Escape")

    await openActions(page, "carla@horizonte.edu.br")
    await expect(page.getByRole("menuitem", { name: "Reenviar" })).toBeEnabled()
    await expect(page.getByRole("menuitem", { name: "Cancelar convite" })).toBeDisabled()
  })

  test("resends an expired invitation after confirming, replacing the old link", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)

    await openActions(page, "carla@horizonte.edu.br")
    await page.getByRole("menuitem", { name: "Reenviar" }).click()
    const dialog = page.getByRole("dialog", { name: "Reenviar convite?" })
    await expect(dialog).toContainText("O link anterior deixa de funcionar.")
    await dialog.getByRole("button", { name: "Reenviar convite" }).click()

    await expect(
      page.getByText("Convite reenviado para carla@horizonte.edu.br. O link anterior não funciona mais."),
    ).toBeVisible()
    expect(lastCall(calls, "POST", "/api/invitations/13/resend")).toBeTruthy()
    // The list is read again: the old one is replaced, the new one pending.
    await expect(rowOf(page, "carla@horizonte.edu.br").filter({ hasText: "Substituído" })).toBeVisible()
    await expect(rowOf(page, "carla@horizonte.edu.br").filter({ hasText: "Pendente" })).toBeVisible()
  })

  test("cancels a pending invitation after confirming", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)

    await openActions(page, "ana.lima@horizonte.edu.br")
    await page.getByRole("menuitem", { name: "Cancelar convite" }).click()
    const dialog = page.getByRole("dialog", { name: "Cancelar convite?" })
    await dialog.getByRole("button", { name: "Cancelar convite" }).click()

    await expect(page.getByText("Convite cancelado.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/invitations/11/cancel")).toBeTruthy()
    await expect(rowOf(page, "ana.lima@horizonte.edu.br")).toContainText("Cancelado")
  })

  test("reads the list again when the invitation changed meanwhile", async ({ page }) => {
    await mockUserAccessApi(page, { stateConflict: "INVITATION_STATE_INVALID" })
    await signInAndOpen(page, invitesPath)

    await openActions(page, "ana.lima@horizonte.edu.br")
    await page.getByRole("menuitem", { name: "Cancelar convite" }).click()
    await page
      .getByRole("dialog", { name: "Cancelar convite?" })
      .getByRole("button", { name: "Cancelar convite" })
      .click()

    await expect(page.getByText("Este convite mudou de situação. A lista foi atualizada.")).toBeVisible()
  })

  test("filters by status on the backend", async ({ page }) => {
    const { calls } = await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)
    await expect(rowOf(page, "ana.lima@horizonte.edu.br")).toBeVisible()

    await page.getByRole("combobox", { name: /^Situação/ }).click()
    await page.getByRole("option", { exact: true, name: "Vencido" }).click()

    await expect(rowOf(page, "ana.lima@horizonte.edu.br")).toHaveCount(0)
    await expect(rowOf(page, "carla@horizonte.edu.br")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/invitations")?.query).toMatchObject({ page: "0", status: "EXPIRED" })
  })

  test("adds an invitation sent from here to the list", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, invitesPath)

    await page.getByRole("button", { name: "Convidar usuário" }).click()
    const dialog = page.getByRole("dialog", { name: "Convidar usuário" })
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("lia@horizonte.edu.br")
    await dialog.getByRole("combobox", { name: /^Papel/ }).click()
    await page.getByRole("option", { exact: true, name: "Responsável" }).click()
    await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
    await page.getByRole("option", { exact: true, name: "Unidade Aldeota" }).click()
    await dialog.getByRole("button", { name: "Revisar" }).click()
    await dialog.getByRole("button", { name: "Enviar convite" }).click()

    await expect(rowOf(page, "lia@horizonte.edu.br")).toContainText("Pendente")
  })
})
