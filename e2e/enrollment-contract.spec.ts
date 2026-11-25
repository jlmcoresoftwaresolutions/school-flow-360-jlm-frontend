import { mockEnrollmentApi } from "./support/enrollments.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The enrollment contract (EPIC 6, P05 slice 3C): the school's contract model, written and approved by
// the Admin, and the contract of an enrollment, generated from it and accepted by each signer through an
// individual link. The backend is mocked (e2e/support/enrollments.ts) and keeps what is saved; the
// signed-in user is an Admin unless a test says otherwise.

const templatesPath = "/administration/contract-templates"
const enrollmentPath = "/administration/enrollments/501"

const rowOf = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const versionAction = async (page: Page, version: number, action: string) => {
  await page.getByRole("button", { name: `Ações da versão ${version}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

test.describe("contract models", () => {
  test("writes a new version from the approved one and approves it with the legal reference", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { contract: true })
    await signInAndOpen(page, "/home")
    await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Modelos de contrato" }).click()

    await expect(page).toHaveURL(new RegExp(`${templatesPath}$`))
    await expect(page.getByText("A versão 1 está aprovada: é ela que gera os contratos.")).toBeVisible()
    await expect(rowOf(page, "v1")).toContainText("Aprovado")
    await expect(rowOf(page, "v1")).toContainText("Parecer 12/2026")

    await page.getByRole("button", { name: "Nova versão" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova versão do modelo" })
    const body = dialog.getByRole("textbox", { name: /^Texto do contrato/ })
    await expect(body).toHaveValue("Contrato de matrícula de {{student.name}} na {{unit.name}}.")
    await body.fill("Contrato de {{student.name}}, mensalidade de {{price.amount}}.")
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click()
    await expect(dialog.getByText("O texto usa um campo que não existe.")).toBeVisible()
    await body.fill("Contrato de {{student.name}}, que começa em {{start.date}}.")
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click()
    await expect(page.getByText("Rascunho salvo. Ele só gera contratos depois de aprovado.")).toBeVisible()
    await expect(rowOf(page, "v2")).toContainText("Rascunho")

    await versionAction(page, 2, "Aprovar")
    const approve = page.getByRole("dialog", { name: "Aprovar a versão 2?" })
    await approve.getByRole("button", { name: "Aprovar" }).click()
    await expect(approve.getByText("Informe a referência da aprovação do jurídico.")).toBeVisible()
    await approve.getByRole("textbox", { name: /^Referência da aprovação/ }).fill("Parecer 13/2026")
    await approve.getByRole("button", { name: "Aprovar" }).click()
    await expect(page.getByText("Versão aprovada.")).toBeVisible()
    await expect(rowOf(page, "v2")).toContainText("Aprovado")
    await expect(rowOf(page, "v1")).toContainText("Aposentado")
    expect(lastCall(calls, "POST", "/api/contract-templates/72/approve")?.body).toEqual({
      legalApprovalRef: "Parecer 13/2026",
      version: 0,
    })

    // An approved version is never edited: only seen, copied or retired.
    await page.getByRole("button", { name: "Ações da versão 2" }).click()
    await expect(page.getByRole("menuitem", { name: "Editar" })).toHaveCount(0)
    await page.getByRole("menuitem", { name: "Ver texto" }).click()
    await expect(page.getByRole("dialog")).toContainText("que começa em {{start.date}}")
  })

  test("lets the Secretaria read the models, without changing them", async ({ page }) => {
    await mockEnrollmentApi(page, { contract: true, readOnly: true })
    await signInAndOpen(page, templatesPath, secretariaContext)

    await expect(rowOf(page, "v1")).toContainText("Aprovado")
    await expect(page.getByText("Só a Administração escreve e aprova o modelo.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova versão" })).toHaveCount(0)
    await page.getByRole("button", { name: "Ações da versão 1" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Ver texto"])
  })
})

test.describe("enrollment contract", () => {
  test("generates the contract and asks the signer to accept it, revoking and asking again", async ({ page }) => {
    const { calls } = await mockEnrollmentApi(page, { contract: true })
    await signInAndOpen(page, enrollmentPath)
    await expect(page.getByText("O contrato ainda não foi gerado ou aceito")).toBeVisible()

    await page.getByRole("tab", { name: "Contrato" }).click()
    await expect(page.getByText("O contrato ainda não foi gerado.")).toBeVisible()
    await page.getByRole("button", { name: "Gerar contrato" }).click()
    await expect(page.getByText("Contrato gerado.")).toBeVisible()
    await expect(page.getByText("Contrato de prestação de serviços educacionais")).toBeVisible()
    await expect(page.getByText(/a partir da versão 1 do modelo · código do texto a1b2c3d4e5f6/)).toBeVisible()
    await page.getByRole("button", { name: "Ver texto" }).click()
    await expect(page.getByLabel("Texto do contrato")).toContainText("Contrato de matrícula de Ana Beatriz Souza")

    const signers = page.getByRole("list", { name: "Quem assina" })
    const fernanda = signers.getByRole("listitem").filter({ hasText: "Fernanda Souza" })
    await expect(fernanda).toContainText("Não pedido")
    await page.getByRole("button", { name: "Pedir aceite a todos" }).click()
    await expect(page.getByText("Aceite pedido por e-mail.")).toBeVisible()
    await expect(fernanda).toContainText("Aguardando aceite")
    await expect(fernanda).toContainText("fernanda@exemplo.com · Link válido até")
    expect(lastCall(calls, "POST", "/api/enrollments/501/contract/acceptances")?.body).toEqual({})

    await fernanda.getByRole("button", { name: "Revogar" }).click()
    await page
      .getByRole("dialog", { name: "Revogar o pedido de aceite de Fernanda Souza?" })
      .getByRole("button", { name: "Revogar" })
      .click()
    await expect(page.getByText("Pedido revogado.")).toBeVisible()
    await expect(fernanda).toContainText("Revogado")

    await fernanda.getByRole("button", { name: "Pedir aceite" }).click()
    await expect(fernanda).toContainText("Aguardando aceite")
    expect(lastCall(calls, "POST", "/api/enrollments/501/contract/acceptances")?.body).toEqual({ signerId: 301 })
  })

  test("says the contract isn't asked while no model is approved", async ({ page }) => {
    await mockEnrollmentApi(page, { readyButStartDate: true })
    await signInAndOpen(page, enrollmentPath)

    await page.getByRole("tab", { name: "Contrato" }).click()
    await expect(page.getByText("A escola ainda não aprovou um modelo de contrato")).toBeVisible()
    await page.getByRole("button", { name: "Gerar contrato" }).click()
    await expect(page.getByRole("alert")).toContainText("Nenhum modelo de contrato está aprovado.")
  })
})
