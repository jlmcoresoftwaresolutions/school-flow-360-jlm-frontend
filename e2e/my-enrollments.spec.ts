import { apiAnswer, expect, type Page, test } from "./support/test.ts"
import { apiError, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// "Minhas matrículas" (EPIC 6, P05 slice 3C): what the Aluno and the Responsável see of their enrollments,
// only the minimum. The backend is mocked.

const myEnrollmentsPath = "/academic/my-enrollments"

// Someone with a single role in Unidade Aldeota.
const withRole = (role: string) => ({
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role }],
  roles: [role],
})

// A guardian of two students: Ana's enrollment is confirmed, Bruno's is still being prepared.
const mine = [
  {
    className: "1º ano A",
    enrollmentNumber: "2027-000042",
    id: 501,
    startDate: "2027-02-01",
    status: "ACTIVE",
    studentId: 201,
    studentName: "Ana Beatriz Souza",
    unitName: "Unidade Aldeota",
  },
  {
    className: null,
    enrollmentNumber: null,
    id: 502,
    startDate: null,
    status: "IN_PREPARATION",
    studentId: 202,
    studentName: "Bruno Lima",
    unitName: "Unidade Aldeota",
  },
]

const mockMine = async (page: Page, answer: ReturnType<typeof apiAnswer> | ReturnType<typeof apiError>) => {
  await page.route("**/api/enrollments/mine", (route) => route.fulfill(answer))
}

test.describe("my enrollments", () => {
  test("shows the guardian each student's enrollment, a preparation never in detail", async ({ page }) => {
    await mockMine(page, apiAnswer(mine))
    await signInAndOpen(page, "/home", withRole("RESPONSAVEL"))
    await page.getByRole("complementary").getByRole("button", { name: "Acadêmico" }).click()
    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Minhas matrículas" }).click()

    await expect(page).toHaveURL(new RegExp(`${myEnrollmentsPath}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Minhas matrículas" })).toBeVisible()
    const ana = page.getByRole("region", { name: "Ana Beatriz Souza" })
    await expect(ana).toContainText("Matrícula 2027-000042")
    await expect(ana).toContainText("Ativa")
    await expect(ana).toContainText("1º ano A")
    await expect(ana).toContainText("01/02/2027")

    const bruno = page.getByRole("region", { name: "Bruno Lima" })
    await expect(bruno).toContainText("Em preparação")
    await expect(bruno).toContainText("A escola está preparando esta matrícula na Unidade Aldeota.")
    await expect(bruno).not.toContainText("Turma")
  })

  test("says when there is no enrollment, and when they couldn't be read", async ({ page }) => {
    await mockMine(page, apiAnswer([]))
    await signInAndOpen(page, myEnrollmentsPath, withRole("ALUNO"))
    await expect(page.getByText("Nenhuma matrícula")).toBeVisible()

    await mockMine(page, apiError(500))
    await page.reload()
    await expect(page.getByText("Matrículas indisponíveis")).toBeVisible()
  })

  test("is kept away from the school's staff", async ({ page }) => {
    await mockMine(page, apiAnswer(mine))
    await signInAndOpen(page, myEnrollmentsPath)
    await expect(page).toHaveURL(/\/access-denied/)
  })
})
