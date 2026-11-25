import { apiAnswer, expect, type Page, test } from "./support/test.ts"
import { apiError } from "./support/userAccess.ts"

// The e-mail that asks a signer to accept an enrollment contract links to
// /contract-acceptance?token=...&tenant=...; the backend is mocked. No login is needed.
const acceptanceLink = "/contract-acceptance?token=accept-token&tenant=escola_horizonte"

const presentation = (fields: Record<string, unknown> = {}) => ({
  body: "Contrato de matrícula de Ana Beatriz Souza na Unidade Aldeota.\n\nCláusula 1. A escola presta os serviços educacionais.",
  contentHash: "a1b2c3d4e5f6a7b8c9d0",
  expiresAt: "2026-11-26T15:00:00Z",
  signerName: "Fernanda Souza",
  studentName: "Ana Beatriz Souza",
  title: "Contrato de prestação de serviços educacionais",
  unitName: "Unidade Aldeota",
  ...fields,
})

type Call = { body: unknown; headers: Record<string, string> }

// The presentation answers the `shown` versions in turn (the last one again after that), and the
// acceptance answers `accepts` in turn (200 when they run out), recording what was sent.
const mockAcceptance = async (
  page: Page,
  options: { accepts?: ReturnType<typeof apiError>[]; shown?: Record<string, unknown>[]; showError?: number } = {},
) => {
  const reads: Call[] = []
  const accepts: Call[] = []
  const shown = options.shown ?? [presentation()]
  const answers = [...(options.accepts ?? [])]

  await page.route("**/api/public/contract-acceptances/*", (route) => {
    reads.push({ body: null, headers: route.request().headers() })
    if (options.showError) return route.fulfill(apiError(options.showError, "ACCEPTANCE_LINK_INVALID"))
    return route.fulfill(apiAnswer(shown[Math.min(reads.length - 1, shown.length - 1)]))
  })
  await page.route("**/api/public/contract-acceptances/*/accept", (route) => {
    accepts.push({ body: route.request().postDataJSON(), headers: route.request().headers() })
    const answer = answers.shift()
    return route.fulfill(answer ?? apiAnswer(null))
  })

  return { accepts, reads }
}

test.describe("contract acceptance", () => {
  test("shows the exact text and accepts it only with the express confirmation", async ({ page }) => {
    const { accepts, reads } = await mockAcceptance(page)
    await page.goto(acceptanceLink)

    await expect(page.getByRole("heading", { level: 1, name: "Aceite do contrato" })).toBeVisible()
    await expect(page.getByText("Fernanda Souza, leia o contrato de matrícula de Ana Beatriz Souza")).toBeVisible()
    await expect(page.getByRole("document", { name: "Texto do contrato" })).toContainText("Cláusula 1.")
    await expect(page.getByText("Código do texto: a1b2c3d4e5f6")).toBeVisible()
    expect(reads[0].headers["x-tenant-id"]).toBe("escola_horizonte")

    await page.getByRole("button", { name: "Aceitar contrato" }).click()
    await expect(page.getByText("Marque a confirmação para aceitar o contrato.")).toBeVisible()
    expect(accepts).toHaveLength(0)

    await page.getByRole("checkbox", { name: /Li o contrato acima/ }).check()
    await page.getByRole("button", { name: "Aceitar contrato" }).click()
    await expect(page.getByText("Contrato aceito", { exact: true })).toBeVisible()
    expect(accepts[0].body).toEqual({ confirm: true, contractHash: "a1b2c3d4e5f6a7b8c9d0" })
    expect(accepts[0].headers["x-tenant-id"]).toBe("escola_horizonte")
    expect(accepts[0].headers.authorization).toBeUndefined()
  })

  test("reads the new version again when the school changed the contract meanwhile", async ({ page }) => {
    const { accepts } = await mockAcceptance(page, {
      accepts: [apiError(409, "CONTRACT_VERSION_CHANGED")],
      shown: [presentation(), presentation({ body: "Versão nova do contrato.", contentHash: "ffeeddccbbaa99887766" })],
    })
    await page.goto(acceptanceLink)

    await page.getByRole("checkbox", { name: /Li o contrato acima/ }).check()
    await page.getByRole("button", { name: "Aceitar contrato" }).click()
    await expect(page.getByRole("alert")).toContainText("A escola gerou uma versão nova do contrato.")
    await expect(page.getByRole("document", { name: "Texto do contrato" })).toContainText("Versão nova do contrato.")
    await expect(page.getByRole("checkbox", { name: /Li o contrato acima/ })).not.toBeChecked()

    await page.getByRole("checkbox", { name: /Li o contrato acima/ }).check()
    await page.getByRole("button", { name: "Aceitar contrato" }).click()
    await expect(page.getByText("Contrato aceito", { exact: true })).toBeVisible()
    expect(accepts[1].body).toEqual({ confirm: true, contractHash: "ffeeddccbbaa99887766" })
  })

  test("says a dead link is invalid, whatever the reason", async ({ page }) => {
    await mockAcceptance(page, { showError: 410 })
    await page.goto(acceptanceLink)
    await expect(page.getByText("Link inválido")).toBeVisible()

    await page.goto("/contract-acceptance")
    await expect(page.getByText("Link inválido")).toBeVisible()
  })

  test("ends on the invalid link when it dies while the page is open", async ({ page }) => {
    await mockAcceptance(page, { accepts: [apiError(410, "ACCEPTANCE_LINK_INVALID")] })
    await page.goto(acceptanceLink)

    await page.getByRole("checkbox", { name: /Li o contrato acima/ }).check()
    await page.getByRole("button", { name: "Aceitar contrato" }).click()
    await expect(page.getByText("Link inválido")).toBeVisible()
  })
})
