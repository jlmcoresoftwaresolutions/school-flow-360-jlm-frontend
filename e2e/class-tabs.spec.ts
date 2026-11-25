import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The class detail's Students, Capacity and History tabs and the academic overview (P04 phase 6). The
// students and the occupation come from the enrollment, which doesn't answer yet: they say "unavailable",
// never zero nor an empty class. The capacity is reviewed with a reason (lowering it needs the
// enrollment), the history is filtered by type and dates, and the overview counts the classes of the
// chosen unit and period. The backend is mocked (e2e/support/academic.ts); the signed-in user is an Admin
// unless a test says otherwise.

const classPath = "/academic/classes/61"
const overviewPath = "/academic/overview"

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const openTab = async (page: Page, name: string) => {
  await page.getByRole("tab", { name }).click()
}

const stat = (page: Page, label: string) =>
  page
    .getByRole("list", { name: "Números da estrutura acadêmica" })
    .getByRole("listitem")
    .filter({ has: page.getByText(label, { exact: true }) })

const professor = { ...secretariaContext, assignments: [secretariaContext.assignments[1]], roles: ["PROFESSOR"] }

test.describe("students tab", () => {
  test("says the list is unavailable while the enrollment doesn't answer, never an empty class", async ({ page }) => {
    await mockAcademicApi(page)
    await signInAndOpen(page, classPath)
    await openTab(page, "Alunos")

    await expect(page.getByText("Lista de alunos indisponível")).toBeVisible()
    await expect(page.getByText("Isso não quer dizer que a turma esteja vazia.")).toBeVisible()
    await expect(page.getByText("Nenhum aluno matriculado nesta turma.")).toHaveCount(0)
  })

  test("lists the enrolled students and searches them, when the enrollment answers", async ({ page }) => {
    const { calls } = await mockAcademicApi(page, { enrollmentAvailable: true })
    await signInAndOpen(page, classPath)
    await openTab(page, "Alunos")

    await expect(row(page, "Ana Beatriz Lima")).toContainText("Ativa")
    await expect(row(page, "Carlos Eduardo Reis")).toContainText("Trancada")
    await expect(page.getByText(/^Lista da Matrícula de /)).toBeVisible()

    await page.getByRole("searchbox", { name: "Buscar aluno" }).fill("bru")
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(row(page, "Bruno Costa")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/academic/classes/61/students")?.query).toMatchObject({ q: "bru" })
  })
})

test.describe("capacity tab", () => {
  test("shows the occupation as unavailable, refuses lowering it, and raises the limit", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, classPath)
    await openTab(page, "Capacidade")

    const capacity = page.getByRole("region", { name: "Capacidade" })
    await expect(capacity).toContainText("Limite30")
    await expect(capacity).toContainText("OcupaçãoIndisponível")
    await expect(capacity).toContainText("VagasIndisponível")
    await expect(page.getByText("A exceção de lotação está desligada pela instituição.")).toBeVisible()

    await page.getByRole("button", { name: "Revisar capacidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Revisar capacidade" })
    const limit = dialog.getByRole("textbox", { name: /^Novo limite/ })
    await limit.fill("25")
    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Turma menor")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(dialog.getByRole("alert")).toContainText("A Matrícula não respondeu agora")

    await limit.fill("32")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Capacidade revisada para 32.")).toBeVisible()
    expect(lastCall(calls, "POST", "/api/academic/classes/61/capacity-review")?.body).toEqual({
      newCapacity: 32,
      reason: "Turma menor",
      version: 0,
    })
    await expect(page.getByRole("region", { name: "Capacidade" })).toContainText("Limite32")
  })

  test("shows the seats and refuses a limit below the enrolled students", async ({ page }) => {
    await mockAcademicApi(page, { enrollmentAvailable: true })
    await signInAndOpen(page, classPath)
    await openTab(page, "Capacidade")

    const capacity = page.getByRole("region", { name: "Capacidade" })
    await expect(capacity).toContainText("Ocupação2")
    await expect(capacity).toContainText("Vagas28")
    await expect(capacity).toContainText("Excedente0")

    await page.getByRole("button", { name: "Revisar capacidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Revisar capacidade" })
    const limit = dialog.getByRole("textbox", { name: /^Novo limite/ })
    await limit.fill("1")
    await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Teste")
    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(limit).toHaveAccessibleDescription(/abaixo dos alunos matriculados/)
  })
})

test.describe("history tab", () => {
  test("lists the class's events newest first, and filters them", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, classPath)
    await openTab(page, "Histórico")

    const reviewed = row(page, "Capacidade revisada")
    await expect(reviewed).toContainText("28 → 30")
    await expect(reviewed).toContainText("Motivo: Sala maior")
    await expect(reviewed).toContainText("João Silva")
    const activated = row(page, "Turma ativada")
    await expect(activated).toContainText("Em preparação → Ativa")
    await expect(activated).toContainText("Sistema")
    await expect(row(page, "Professor vinculado")).toContainText("A partir de 02/02/2026")
    await expect(row(page, "Turma criada")).toContainText(
      "Alterado: Código, Nome, Turno, Sala, Capacidade, Disciplinas",
    )
    await expect(page.getByRole("row").nth(1)).toContainText("Capacidade revisada")

    await page.getByRole("combobox", { name: /^Tipo/ }).click()
    await page.getByRole("option", { exact: true, name: "Situação" }).click()
    await expect(page.getByRole("row")).toHaveCount(2)
    expect(lastCall(calls, "GET", "/api/academic/classes/61/history")?.query).toMatchObject({ type: "STATUS" })

    const from = page.getByRole("textbox", { name: /^De/ })
    await from.fill("10/03/2026")
    await from.press("Tab")
    const to = page.getByRole("textbox", { name: /^Até/ })
    await to.fill("01/03/2026")
    await to.press("Tab")
    await expect(page.getByRole("alert")).toContainText("A data final não pode ser antes da inicial.")
  })

  test("shows a Professor only the General, Students and Teachers tabs", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, classPath, professor)

    await expect(page.getByRole("tab")).toHaveText(["Geral", "Alunos", "Professores"])
  })
})

test.describe("academic overview", () => {
  test("counts the classes of the scope, and narrows by unit", async ({ page }) => {
    const { calls } = await mockAcademicApi(page)
    await signInAndOpen(page, overviewPath)

    await expect(stat(page, "Turmas")).toContainText("4")
    await expect(stat(page, "Em preparação")).toContainText("3")
    await expect(stat(page, "Ativas")).toContainText("1")
    await expect(stat(page, "Capacidade das ativas")).toContainText("30")
    await expect(stat(page, "Ocupação")).toContainText("Indisponível")
    await expect(stat(page, "Vagas")).toContainText("Indisponível")
    await expect(stat(page, "Ativas sem professor")).toContainText("0")
    await expect(page.getByText(/Isso não quer dizer que não há alunos/)).toBeVisible()

    await page.getByRole("combobox", { name: /^Unidade/ }).click()
    await page.getByRole("option", { exact: true, name: "Unidade Caucaia" }).click()
    await expect(stat(page, "Turmas")).toContainText("1")
    expect(lastCall(calls, "GET", "/api/academic/overview")?.query).toEqual({ unitId: "2" })

    // The shortcuts sit in the filter bar, as the actions of the other lists.
    await page
      .getByRole("search")
      .getByRole("group", { name: "Atalhos" })
      .getByRole("button", { name: "Criar turma" })
      .click()
    await expect(page).toHaveURL(/\/academic\/classes$/)
  })

  test("points to the first step when there's no academic structure yet", async ({ page }) => {
    await mockAcademicApi(page, { emptyStructure: true })
    await signInAndOpen(page, overviewPath)

    await expect(page.getByText("Estrutura acadêmica não iniciada")).toBeVisible()
    await page.getByRole("button", { name: "Cadastrar período" }).click()
    await expect(page).toHaveURL(/\/academic\/periods$/)
  })

  test("offers a Professor no shortcut", async ({ page }) => {
    await mockAcademicApi(page, { readOnly: true })
    await signInAndOpen(page, overviewPath, professor)

    await expect(stat(page, "Turmas")).toBeVisible()
    await expect(page.getByRole("group", { name: "Atalhos" })).toHaveCount(0)
  })
})
