import { expect, type Page, test } from "./support/test.ts"
import { secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// Who opens the academic structure pages (P04, CT09): the Admin, the Secretaria and the Coordenação
// manage them, the Professor reads them, the Aluno and the Responsável only see the calendar, and the
// Financeiro none. The pages read nothing yet: this covers the menu and the access rules.

const academicPages = [
  { heading: "Visão geral", menu: "Visão geral", path: "/academic/overview" },
  { heading: "Períodos letivos", menu: "Períodos letivos", path: "/academic/periods" },
  { heading: "Etapas e séries", menu: "Etapas e séries", path: "/academic/grade-levels" },
  { heading: "Disciplinas", menu: "Disciplinas", path: "/academic/subjects" },
  { heading: "Ofertas", menu: "Ofertas", path: "/academic/offers" },
  { heading: "Salas", menu: "Salas", path: "/academic/rooms" },
  { heading: "Turmas", menu: "Turmas", path: "/academic/classes" },
  { heading: "Calendário", menu: "Calendário", path: "/academic/calendar" },
]

// Someone with a single role in Unidade Aldeota.
const withRole = (role: string) => ({
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role }],
  roles: [role],
})

const menu = (page: Page) => page.getByRole("complementary")

const openAcademicGroup = async (page: Page) => {
  await menu(page).getByRole("button", { name: "Acadêmico" }).click()
}

test.describe("academic access", () => {
  test("gives the Admin every academic page, from the menu", async ({ page }) => {
    await signInAndOpen(page, "/home")
    await openAcademicGroup(page)

    for (const academicPage of academicPages) {
      await menu(page).getByRole("button", { exact: true, name: academicPage.menu }).click()
      await expect(page).toHaveURL(new RegExp(`${academicPage.path}$`))
      await expect(page.getByRole("heading", { level: 1, name: academicPage.heading })).toBeVisible()
    }
  })

  test("opens the academic pages for the Coordenação, but not the people", async ({ page }) => {
    await signInAndOpen(page, "/academic/periods", withRole("COORDENACAO"))
    await expect(page.getByRole("heading", { level: 1, name: "Períodos letivos" })).toBeVisible()

    await page.goto("/academic/calendar")
    await expect(page.getByRole("heading", { level: 1, name: "Calendário" })).toBeVisible()

    await page.goto("/administration/students")
    await expect(page).toHaveURL(/\/access-denied$/)
  })

  test("lets the Professor read the academic pages", async ({ page }) => {
    await signInAndOpen(page, "/academic/classes", withRole("PROFESSOR"))
    await expect(page.getByRole("heading", { level: 1, name: "Turmas" })).toBeVisible()

    await openAcademicGroup(page)
    await expect(menu(page).getByRole("button", { exact: true, name: "Ofertas" })).toBeVisible()
  })

  test("gives the Aluno and the Responsável only the calendar", async ({ page }) => {
    await signInAndOpen(page, "/academic/calendar", withRole("ALUNO"))
    await expect(page.getByRole("heading", { level: 1, name: "Calendário" })).toBeVisible()

    await openAcademicGroup(page)
    await expect(menu(page).getByRole("button", { exact: true, name: "Turmas" })).toHaveCount(0)
    await expect(menu(page).getByRole("button", { exact: true, name: "Períodos letivos" })).toHaveCount(0)

    await page.goto("/academic/classes")
    await expect(page).toHaveURL(/\/access-denied$/)
  })

  test("keeps the academic structure closed to the Financeiro", async ({ page }) => {
    await signInAndOpen(page, "/academic/calendar", withRole("FINANCEIRO"))
    await expect(page).toHaveURL(/\/access-denied$/)

    await page.goto("/academic/overview")
    await expect(page).toHaveURL(/\/access-denied$/)
  })
})
