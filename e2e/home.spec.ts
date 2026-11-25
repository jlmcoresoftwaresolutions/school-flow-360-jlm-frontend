import { expect, type Page, test } from "./support/test.ts"
import { secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The home page: a short presentation of SchoolFlow360º and a card for each main area the person may
// open, with a button to its page. The areas follow the menu's access rule.

const professor = {
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role: "PROFESSOR" }],
  fullName: "Ana Costa",
  roles: ["PROFESSOR"],
}

const featureLinks = (page: Page) => page.getByRole("region", { name: "Principais funcionalidades" }).getByRole("link")

test("presents SchoolFlow360º and greets the person by the first name", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Olá, João!" })).toBeVisible()
  await expect(page.getByText(/é a plataforma de gestão da sua escola/)).toBeVisible()
  await expect(page.getByRole("list", { name: "O que o SchoolFlow360º oferece" }).getByRole("listitem")).toHaveCount(3)
})

test("offers an Admin every main area, each opening its page", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(featureLinks(page)).toHaveText(["Abrir", "Abrir", "Abrir", "Abrir", "Abrir", "Abrir", "Abrir"])
  await expect(page.getByRole("link", { name: "Abrir Auditoria de acessos" })).toHaveAttribute(
    "href",
    "/access-logs/audit",
  )

  await page.getByRole("link", { name: "Abrir Minha Organização" }).click()

  await expect(page).toHaveURL(/\/administration\/my-organization$/)
})

test("offers a Professor only the areas the role opens", async ({ page }) => {
  await signInAndOpen(page, "/home", professor)

  await expect(page.getByRole("heading", { level: 2, name: "Olá, Ana!" })).toBeVisible()
  await expect(featureLinks(page)).toHaveCount(2)
  await expect(page.getByRole("link", { name: "Abrir Estrutura acadêmica" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Abrir Calendário letivo" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Abrir Minha Organização" })).toHaveCount(0)
})

test("never asks for the photo of the screens before signing in", async ({ page }) => {
  await signInAndOpen(page, "/home")

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.locator("link[rel='preload'][as='image']")).toHaveCount(0)
})
