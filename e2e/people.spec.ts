import { guardians, mockPeopleApi, students } from "./support/people.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The people screens of the P03 (phase 1): the students and guardians lists, read from the backend page
// by page, with their search, filters and states. The backend is mocked (e2e/support/people.ts); the
// signed-in user is an Admin unless a test says otherwise.

const studentsPath = "/administration/students"
const guardiansPath = "/administration/guardians"

const table = (page: Page) => page.getByRole("table")
const rowOf = (page: Page, text: string) => table(page).getByRole("row").filter({ hasText: text })

const pick = async (page: Page, label: RegExp, option: string) => {
  await page.getByRole("combobox", { name: label }).click()
  await page.getByRole("option", { exact: true, name: option }).click()
}

test.describe("students list", () => {
  test("lists each student with the code, the reference unit, the guardians and the status", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath)

    await expect(page.getByRole("heading", { level: 1, name: "Alunos" })).toBeVisible()
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("ALU-000001")
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("Unidade Aldeota")
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("2 responsáveis")
    await expect(rowOf(page, "Ana Beatriz Souza")).toContainText("Ativo")
    // One guardian, none of them financial.
    await expect(rowOf(page, "Bruno Lima")).toContainText("1 responsável")
    await expect(rowOf(page, "Bruno Lima")).toContainText("Sem responsável financeiro")
    // A draft without a guardian (it can't be activated yet).
    await expect(rowOf(page, "Carla Dias")).toContainText("Sem responsável")
    await expect(rowOf(page, "Carla Dias")).toContainText("Rascunho")
    await expect(rowOf(page, "Davi Rocha")).toContainText("Inativo")

    expect(lastCall(calls, "GET", "/api/students")?.query).toMatchObject({
      direction: "asc",
      page: "0",
      sortBy: "fullName",
    })
  })

  test("searches and filters on the backend, starting over from the first page", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath)
    await expect(rowOf(page, "Ana Beatriz Souza")).toBeVisible()

    await page.getByRole("searchbox", { name: "Buscar alunos" }).fill("ALU-000002")
    await expect(table(page).getByRole("row")).toHaveCount(2)
    await expect(rowOf(page, "Bruno Lima")).toBeVisible()
    expect(lastCall(calls, "GET", "/api/students")?.query.q).toBe("ALU-000002")

    await page.getByRole("searchbox", { name: "Buscar alunos" }).fill("")
    await pick(page, /^Unidade de referência/, "Unidade Caucaia")
    await expect(rowOf(page, "Davi Rocha")).toBeVisible()
    await expect(rowOf(page, "Ana Beatriz Souza")).toHaveCount(0)
    expect(lastCall(calls, "GET", "/api/students")?.query).toMatchObject({ page: "0", unitId: "2" })

    await pick(page, /^Situação/, "Rascunho")
    await expect(table(page)).toContainText("Nenhum aluno encontrado com esses filtros.")
    expect(lastCall(calls, "GET", "/api/students")?.query).toMatchObject({ status: "DRAFT", unitId: "2" })
  })

  test("tells an institution without students, a failure, a refusal and the search limit apart", async ({ page }) => {
    await mockPeopleApi(page, { students: [] })
    await signInAndOpen(page, studentsPath)
    await expect(page.getByText("Nenhum aluno ainda")).toBeVisible()

    await mockPeopleApi(page, { listFailure: { students: { status: 500 } } })
    await page.reload()
    await expect(page.getByText("Não foi possível carregar os alunos")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()

    await mockPeopleApi(page, { listFailure: { students: { status: 403 } } })
    await page.reload()
    await expect(page.getByText("Você não tem acesso aos alunos")).toBeVisible()

    await mockPeopleApi(page, { listFailure: { students: { code: "SEARCH_RATE_LIMITED", status: 429 } } })
    await page.reload()
    await expect(page.getByText("Muitas buscas em pouco tempo")).toBeVisible()

    // Trying again after the wait reads the list again.
    await mockPeopleApi(page)
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(rowOf(page, students[0].fullName)).toBeVisible()
  })

  test("opens from the Administração menu, with its breadcrumb", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, "/home")

    const menu = page.getByRole("complementary")
    await menu.getByRole("button", { name: "Administração" }).click()
    await menu.getByRole("button", { name: "Alunos" }).click()

    await expect(page).toHaveURL(/\/administration\/students$/)
    const breadcrumb = page.getByRole("navigation", { name: "Você está em" })
    await expect(breadcrumb).toContainText("Administração")
    await expect(breadcrumb.getByText("Alunos")).toHaveAttribute("aria-current", "page")
  })
})

test.describe("guardians list", () => {
  test("lists each guardian with the masked contact, the students and the status", async ({ page }) => {
    const { calls } = await mockPeopleApi(page)
    await signInAndOpen(page, guardiansPath)

    await expect(page.getByRole("heading", { level: 1, name: "Responsáveis" })).toBeVisible()
    await expect(rowOf(page, "Fernanda Souza")).toContainText("f*****@gmail.com")
    await expect(rowOf(page, "Fernanda Souza")).toContainText("***.111.222-**")
    await expect(rowOf(page, "Fernanda Souza")).toContainText("(85) 98888-2200")
    await expect(rowOf(page, "Fernanda Souza")).toContainText("1 aluno")
    await expect(rowOf(page, "Gustavo Lima")).toContainText("2 alunos")
    await expect(rowOf(page, "Helena Rocha")).toContainText("Nenhum aluno vinculado")
    await expect(rowOf(page, "Helena Rocha")).toContainText("Inativo")

    await pick(page, /^Unidade/, "Unidade Caucaia")
    await expect(rowOf(page, "Fernanda Souza")).toHaveCount(0)
    await expect(rowOf(page, guardians[2].fullName)).toBeVisible()
    expect(lastCall(calls, "GET", "/api/guardians")?.query).toMatchObject({ page: "0", unitId: "2" })
  })

  test("tells an institution without guardians apart from a failure", async ({ page }) => {
    await mockPeopleApi(page, { guardians: [] })
    await signInAndOpen(page, guardiansPath)
    await expect(page.getByText("Nenhum responsável ainda")).toBeVisible()

    await mockPeopleApi(page, { listFailure: { guardians: { status: 500 } } })
    await page.reload()
    await expect(page.getByText("Não foi possível carregar os responsáveis")).toBeVisible()
  })
})

test.describe("people access", () => {
  test("opens the people pages for a Secretaria", async ({ page }) => {
    await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath, secretariaContext)

    await expect(page.getByRole("heading", { level: 1, name: "Alunos" })).toBeVisible()
  })

  test("keeps the people pages closed to the other roles, and out of their menu", async ({ page }) => {
    const professor = {
      ...secretariaContext,
      assignments: [secretariaContext.assignments[1]],
      roles: ["PROFESSOR"],
    }
    await mockPeopleApi(page)
    await signInAndOpen(page, studentsPath, professor)
    await expect(page).toHaveURL(/\/access-denied$/)

    await page.goto(guardiansPath)
    await expect(page).toHaveURL(/\/access-denied$/)

    // Without Minha Unidade either, the Administração group isn't in the menu at all.
    await expect(page.getByRole("complementary").getByRole("button", { name: "Administração" })).toHaveCount(0)
  })
})
