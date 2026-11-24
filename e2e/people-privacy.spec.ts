import { mockPeopleApi, unexpectedFailureName } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The LGPD tools and the hardening of the P03 (phase 7): exporting everything kept about a person,
// anonymizing an inactive one (after which nothing about it can be changed), cleaning up abandoned
// drafts - all Admin only - and the support reference on an unexpected failure. The backend is mocked
// (e2e/support/people.ts); the signed-in user is an Admin unless a test says otherwise.

const chooseAction = async (page: Page, menu: string, name: string) => {
  await page.getByRole("button", { name: menu }).click()
  await page.getByRole("menuitem", { name }).click()
}

test.describe("LGPD tools", () => {
  test("exports everything kept about a student as a JSON file", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students/201")

    const download = page.waitForEvent("download")
    await chooseAction(page, "Ações do aluno", "Exportar dados (LGPD)")

    expect((await download).suggestedFilename()).toBe("dados-pessoais-201.json")
    await expect(page.getByText("Dados exportados. A exportação fica registrada na auditoria.")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/people/201/export")).toBeDefined()
  })

  test("anonymizes an inactive student with the request's protocol, then refuses any change", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students/204")

    await chooseAction(page, "Ações do aluno", "Anonimizar (LGPD)")
    const dialog = page.getByRole("dialog", { name: "Anonimizar Davi Rocha?" })
    await expect(dialog).toContainText("Não tem volta.")
    const confirm = dialog.getByRole("button", { name: "Anonimizar" })
    await expect(confirm).toBeDisabled()

    await dialog.getByRole("checkbox", { name: /não pode ser desfeita/ }).check()
    await dialog.getByRole("textbox", { name: /^Protocolo do pedido do titular/ }).fill("ab")
    await confirm.click()
    await expect(dialog.getByRole("textbox", { name: /^Protocolo do pedido do titular/ })).toHaveAccessibleDescription(
      "Informe o protocolo com 3 a 60 caracteres.",
    )

    await dialog.getByRole("textbox", { name: /^Protocolo do pedido do titular/ }).fill("LGPD-2026-0042")
    await confirm.click()

    await expect(page.getByText("Pessoa anonimizada.")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Pessoa anonimizada" })).toBeVisible()
    expect(lastCall(calls, "POST", "/api/people/204/anonymize")?.body).toEqual({ requestRef: "LGPD-2026-0042" })

    // Nothing about an anonymized person can be changed any more: the profile says so and offers only
    // the export, and the edit page doesn't open the form.
    await expect(
      page.getByText("Os dados pessoais foram apagados a pedido do titular (LGPD).", { exact: false }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Ações do aluno" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Exportar dados (LGPD)"])
    await page.keyboard.press("Escape")

    await page.goto("/administration/students/204/edit")
    await expect(page.getByText("Esta pessoa foi anonimizada e não pode mais ser alterada.")).toBeVisible()
    await expect(page.getByRole("textbox", { name: /^Nome completo/ })).toHaveCount(0)

    await page.goto("/administration/students")
    await expect(page.getByRole("row", { name: /Pessoa anonimizada/ })).toContainText("Anonimizado")
  })

  test("anonymizes an inactive guardian too", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/guardians/303")

    await chooseAction(page, "Ações do responsável", "Anonimizar (LGPD)")
    const dialog = page.getByRole("dialog", { name: "Anonimizar Helena Rocha?" })
    await dialog.getByRole("textbox", { name: /^Protocolo do pedido do titular/ }).fill("LGPD-2026-0050")
    await dialog.getByRole("checkbox", { name: /não pode ser desfeita/ }).check()
    await dialog.getByRole("button", { name: "Anonimizar" }).click()

    await expect(page.getByRole("heading", { level: 1, name: "Pessoa anonimizada" })).toBeVisible()
    await expect(page.getByText("Anonimizado", { exact: true })).toBeVisible()
    await page.getByRole("tab", { name: "Documentos" }).click()
    await expect(page.getByRole("button", { name: "Novo documento" })).toHaveCount(0)
  })

  test("offers the anonymization only for an inactive person", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students/201")

    await page.getByRole("button", { name: "Ações do aluno" }).click()
    await expect(page.getByRole("menuitem", { name: "Exportar dados (LGPD)" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Anonimizar (LGPD)" })).toHaveCount(0)
  })

  test("keeps the LGPD tools to the Admin", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students/204", secretariaContext)

    await page.getByRole("button", { name: "Ações do aluno" }).click()
    await expect(page.getByRole("menuitem", { name: "Reativar aluno" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: /LGPD/ })).toHaveCount(0)

    await page.keyboard.press("Escape")
    await page.goto("/administration/students")
    await expect(page.getByRole("button", { name: "Novo aluno" })).toBeVisible()
    await expect(page.getByRole("button", { exact: true, name: "Limpar rascunhos" })).toHaveCount(0)
  })

  test("cleans up the abandoned drafts", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students")
    await expect(page.getByRole("row").filter({ hasText: "Carla Dias" })).toBeVisible()

    await page.getByRole("button", { exact: true, name: "Limpar rascunhos" }).click()
    const dialog = page.getByRole("dialog", { name: "Limpar rascunhos abandonados?" })
    await expect(dialog).toContainText("prazo de retenção")
    await dialog.getByRole("button", { name: "Limpar rascunhos" }).click()

    await expect(page.getByText("1 rascunho removido.")).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: "Carla Dias" })).toHaveCount(0)
    expect(lastCall(calls, "POST", "/api/people/maintenance/draft-cleanup")).toBeDefined()
  })
})

test.describe("hardening", () => {
  test("gives the support reference of an unexpected failure", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, "/administration/students/202/edit")

    await page.getByRole("textbox", { name: /^Nome completo/ }).fill(unexpectedFailureName)
    await page.getByRole("button", { exact: true, name: "Salvar" }).click()

    await expect(page.getByRole("alert")).toContainText("Referência para o suporte: c0ffee42.")
    await expect(page).toHaveURL(/\/202\/edit$/)
  })
})
