import { filesHost, mockPeopleApi } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, signInAndOpen } from "./support/userAccess.ts"

// The documents and the history of a person (P03, phase 6), in the Documentos and Histórico tabs of the
// student's profile and the guardian's detail: registering a document, attaching, replacing and
// downloading its file, archiving it (never deleting), and reading the registration history. The backend
// is mocked (e2e/support/people.ts) and keeps what is saved; the signed-in user is an Admin.

const pdf = (name: string) => ({ buffer: Buffer.from("%PDF-1.4 documento"), mimeType: "application/pdf", name })

const openTab = async (page: Page, path: string, tab: string) => {
  await signInAndOpen(page, path)
  await page.getByRole("tab", { name: tab }).click()
}

const documentRow = (page: Page, text: string) =>
  page.getByRole("region", { name: "Documentos" }).getByRole("row").filter({ hasText: text })

const chooseDocumentAction = async (page: Page, type: string, action: string) => {
  await page.getByRole("button", { name: `Ações do documento ${type}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("documents", () => {
  test("lists the documents with their status, each person's own", async ({ page }) => {
    await mockPeopleApi(page)
    await openTab(page, "/administration/students/201", "Documentos")

    await expect(documentRow(page, "CPF")).toContainText("***.456.789-**")
    await expect(documentRow(page, "CPF")).toContainText("cpf-ana.pdf")
    await expect(documentRow(page, "CPF")).toContainText("240 KB")
    await expect(documentRow(page, "CPF")).toContainText("Válido")
    await expect(documentRow(page, "Passaporte")).toContainText("10/01/2024")
    await expect(documentRow(page, "Passaporte")).toContainText("Vencido")

    await page.goto("/administration/students/202")
    await page.getByRole("tab", { name: "Documentos" }).click()
    await expect(page.getByText("Nenhum documento registrado.")).toBeVisible()
    await expect(page.getByText("cpf-ana.pdf")).toHaveCount(0)
  })

  test("registers a document and attaches its file at once", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/202", "Documentos")

    await page.getByRole("button", { name: "Novo documento" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo documento" })
    await expect(dialog.getByRole("textbox", { name: /^Validade/ })).toHaveCount(0)
    await pick(page, /^Tipo de documento/, "Passaporte")
    await expect(dialog.getByRole("textbox", { name: /^Validade/ })).toBeVisible()
    await dialog.getByRole("textbox", { name: /^Número do documento/ }).fill("AB123456")
    await dialog.getByLabel(/^Arquivo/).setInputFiles(pdf("passaporte.pdf"))
    await dialog.getByRole("button", { name: "Registrar" }).click()

    await expect(page.getByText("Documento registrado com o arquivo.")).toBeVisible()
    await expect(documentRow(page, "Passaporte")).toContainText("passaporte.pdf")
    await expect(documentRow(page, "Passaporte")).toContainText("Válido")
    expect(lastCall(calls, "POST", "/api/people/202/documents")?.body).toEqual({
      documentNumber: "AB123456",
      documentType: "PASSPORT",
    })
    expect(lastCall(calls, "POST", "/api/people/202/documents/560/file")?.query).toEqual({ version: "0" })
  })

  test("refuses a file that isn't PDF, JPEG or PNG, or is over 10 MB, before sending it", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/202", "Documentos")

    await page.getByRole("button", { name: "Novo documento" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo documento" })
    await pick(page, /^Tipo de documento/, "CPF")
    const file = dialog.getByLabel(/^Arquivo/)

    await file.setInputFiles({ buffer: Buffer.from("GIF89a"), mimeType: "image/gif", name: "foto.gif" })
    await expect(file).toHaveAccessibleDescription("Envie um PDF, JPEG ou PNG.")

    await file.setInputFiles({
      buffer: Buffer.alloc(11 * 1024 * 1024),
      mimeType: "application/pdf",
      name: "grande.pdf",
    })
    await expect(file).toHaveAccessibleDescription("O arquivo passa de 10 MB.")

    await dialog.getByRole("button", { name: "Registrar" }).click()
    await expect(dialog).toBeVisible()
    expect(lastCall(calls, "POST", "/api/people/202/documents")).toBeUndefined()
  })

  test("keeps the document without a file when the storage refuses it", async ({ page }) => {
    await mockPeopleApi(page, { storageDisabled: true })
    await openTab(page, "/administration/students/202", "Documentos")

    await page.getByRole("button", { name: "Novo documento" }).click()
    const dialog = page.getByRole("dialog", { name: "Novo documento" })
    await pick(page, /^Tipo de documento/, "CPF")
    await dialog.getByLabel(/^Arquivo/).setInputFiles(pdf("cpf.pdf"))
    await dialog.getByRole("button", { name: "Registrar" }).click()

    await expect(page.getByText(/Documento registrado sem o arquivo: O armazenamento de arquivos/)).toBeVisible()
    await expect(documentRow(page, "CPF")).toContainText("Sem arquivo")
  })

  test("replaces the file of a document", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/201", "Documentos")

    await chooseDocumentAction(page, "CPF", "Substituir arquivo")
    const dialog = page.getByRole("dialog", { name: "Substituir arquivo" })
    await expect(dialog).toContainText("O arquivo atual (cpf-ana.pdf) é substituído só depois que o novo for guardado.")
    await dialog
      .getByLabel(/^Arquivo/)
      .setInputFiles({ buffer: Buffer.from("PNG"), mimeType: "image/png", name: "cpf-novo.png" })
    await dialog.getByRole("button", { name: "Substituir arquivo" }).click()

    await expect(page.getByText("Arquivo substituído.")).toBeVisible()
    await expect(documentRow(page, "CPF")).toContainText("cpf-novo.png")
    expect(lastCall(calls, "POST", "/api/people/201/documents/501/file")?.query).toEqual({ version: "1" })
  })

  test("downloads a file through a short-lived link", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/201", "Documentos")

    // The link opens in a new tab at once, and nothing keeps it.
    const opened = page.context().waitForEvent("request", (request) => request.url().startsWith(filesHost))
    await chooseDocumentAction(page, "CPF", "Baixar")
    expect((await opened).url()).toBe(`${filesHost}/501`)
    expect(lastCall(calls, "GET", "/api/people/201/documents/501/download")).toBeDefined()
  })

  test("archives a document without deleting it", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/201", "Documentos")

    await chooseDocumentAction(page, "Passaporte", "Arquivar")
    const dialog = page.getByRole("dialog", { name: "Arquivar Passaporte?" })
    await expect(dialog).toContainText("não é apagado")
    await dialog.getByRole("button", { name: "Arquivar" }).click()

    await expect(page.getByText("Passaporte arquivado.")).toBeVisible()
    await expect(documentRow(page, "Passaporte")).toContainText("Arquivado")
    expect(lastCall(calls, "POST", "/api/people/201/documents/502/archive")?.query).toEqual({ version: "1" })

    // An archived document can still be downloaded, and nothing else.
    await page.getByRole("button", { name: "Ações do documento Passaporte" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Baixar"])
  })

  test("is in the guardian's detail too", async ({ page }) => {
    await mockPeopleApi(page)
    await openTab(page, "/administration/guardians/301", "Documentos")

    await expect(page.getByText("Nenhum documento registrado.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Novo documento" })).toBeVisible()
  })
})

test.describe("history", () => {
  test("shows the student's events with only the names of what changed", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await openTab(page, "/administration/students/201", "Histórico")

    const history = page.getByRole("region", { name: "Histórico" })
    await expect(history.getByRole("row").filter({ hasText: "Dados do aluno alterados" }).first()).toContainText(
      "Nome completo, Telefone",
    )
    const link = history.getByRole("row").filter({ hasText: "Vínculo alterado" })
    await expect(link).toContainText("Vínculo nº 2010")
    await expect(link).toContainText("Responsável financeiro")
    await expect(link).not.toContainText("Parentesco")
    await expect(history.getByRole("row").filter({ hasText: "SOMETHING_NEW" })).toBeVisible()
    await expect(history).toContainText("Administração")

    await page.getByRole("button", { name: "Página 2" }).click()
    await expect(history.getByRole("row")).toHaveCount(4)
    expect(lastCall(calls, "GET", "/api/students/201/history")?.query).toEqual({ page: "1", size: "20" })
  })

  test("shows the guardian's events", async ({ page }) => {
    await mockPeopleApi(page)
    await openTab(page, "/administration/guardians/302", "Histórico")

    const history = page.getByRole("region", { name: "Histórico" })
    await expect(history.getByRole("row").filter({ hasText: "Dados do responsável alterados" })).toContainText(
      "Nome social",
    )
    await expect(history.getByRole("row").filter({ hasText: "Responsável cadastrado" })).toContainText(
      "Responsável nº 302",
    )
  })
})
