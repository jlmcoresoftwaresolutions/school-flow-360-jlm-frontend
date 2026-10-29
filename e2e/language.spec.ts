import { expect, test } from "@playwright/test"

// The interface language is the browser's own; there is no language picker (see i18n.ts).

test.describe("in a browser set to English", () => {
  test.use({ locale: "en-US" })

  test("shows the login in English", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1, name: "Access your SchoolFlow360º journey" })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("lang", /^en/)
  })
})

// Each browser language with its login heading and the <html lang> the app sets.
const localized = [
  { heading: "Aceda ao seu percurso SchoolFlow360º", lang: "pt-PT", locale: "pt-PT" },
  { heading: "Accede a tu experiencia SchoolFlow360º", lang: "es", locale: "es-MX" },
  { heading: "Accédez à votre parcours SchoolFlow360º", lang: "fr", locale: "fr-FR" },
]

for (const { heading, lang, locale } of localized) {
  test.describe(`in a browser set to ${locale}`, () => {
    test.use({ locale })

    test("shows the login in that language", async ({ page }) => {
      await page.goto("/login")

      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("lang", lang)
    })
  })
}

test.describe("in a browser set to a language the app doesn't have", () => {
  test.use({ locale: "de-DE" })

  test("falls back to pt-BR", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1, name: "Acesse sua jornada SchoolFlow360º" })).toBeVisible()
  })
})

test.describe("in a browser set to pt-BR", () => {
  test("shows the login in pt-BR, with no way to pick another language", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1, name: "Acesse sua jornada SchoolFlow360º" })).toBeVisible()
    await expect(page.getByRole("button", { name: /idioma|language/i })).toHaveCount(0)
  })

  test("ignores a language remembered from the old language picker", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "en"))

    await page.goto("/login")

    await expect(page.getByRole("heading", { level: 1, name: "Acesse sua jornada SchoolFlow360º" })).toBeVisible()
  })
})
