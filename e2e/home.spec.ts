import { expect, test } from "@playwright/test"

test("renders the greeting", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Olá, mundo!" })).toBeVisible()
})

test("navigates to the experimental page", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("link", { name: "Ver página experimental" }).click()

  await expect(page).toHaveURL("/experimental")
  await expect(page.getByRole("heading", { name: "Página experimental" })).toBeVisible()
})
