import { expect, test } from "@playwright/test"

test("renders the login form", async ({ page }) => {
  await page.goto("/login")

  await expect(page.getByText("Acesse sua jornada SchoolFlow360º")).toBeVisible()
  await expect(page.getByLabel("E-mail")).toBeVisible()
  await expect(page.getByLabel("Senha")).toBeVisible()
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
})

test("accepts typed credentials", async ({ page }) => {
  await page.goto("/login")

  await page.getByLabel("E-mail").fill("diretor@schoolflow360.com.br")
  await page.getByLabel("Senha").fill("senha-super-secreta")

  await expect(page.getByLabel("E-mail")).toHaveValue("diretor@schoolflow360.com.br")
  await expect(page.getByLabel("Senha")).toHaveValue("senha-super-secreta")
})
