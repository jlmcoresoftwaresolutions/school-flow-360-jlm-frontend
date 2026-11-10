import { expect, type Page, test } from "@playwright/test"

// Minha Unidade is being wired to the backend a call at a time: the unit list comes from
// GET /api/school-units, the rest still from the mocked organization service (services/organization).
// Everything on the network (login, the unit list, the CEP lookup) is mocked here. The service's mock
// reads a sessionStorage key to fail its calls (the error state); the empty state is an empty list.
const mockScenarioKey = "sf360.mockScenario"

// The backend's units: one free-text address, ACTIVE/INACTIVE.
const apiSchoolUnits = [
  {
    address: "Avenida Santos Dumont, 1500 - Aldeota, Fortaleza/CE",
    contactEmail: "aldeota@horizonte.edu.br",
    contactPhone: "(85) 3333-1100",
    operationalStatus: "ACTIVE",
    schoolUnitId: 1,
    unitName: "Unidade Aldeota",
    version: 0,
  },
  {
    address: "Avenida Washington Soares, 2200, Bloco B - Edson Queiroz, Fortaleza/CE",
    contactEmail: "secretaria.unidade.edsonqueiroz@horizonte.edu.br",
    contactPhone: "(85) 3333-1200",
    operationalStatus: "ACTIVE",
    schoolUnitId: 2,
    unitName: "Unidade Edson Queiroz",
    version: 0,
  },
  {
    address: "Rua Coronel Correia, 45 - Centro, Caucaia/CE",
    contactEmail: "caucaia@horizonte.edu.br",
    contactPhone: "(85) 3342-0400",
    operationalStatus: "ACTIVE",
    schoolUnitId: 3,
    unitName: "Unidade Caucaia",
    version: 0,
  },
  {
    address: "Avenida da Universidade, 830 - Benfica, Fortaleza/CE",
    contactEmail: "",
    contactPhone: "(85) 3281-0900",
    operationalStatus: "INACTIVE",
    schoolUnitId: 4,
    unitName: "Unidade Benfica",
    version: 1,
  },
]

const signInAndOpen = async (page: Page, scenario?: "error" | "no-units") => {
  const units = scenario === "no-units" ? [] : apiSchoolUnits

  await page.route("**/api/school-units?*", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: { content: units, number: 0, size: 100, totalElements: units.length, totalPages: 1 },
        message: "",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )

  if (scenario === "error") {
    await page.addInitScript(
      (entry) => {
        if (!sessionStorage.getItem("sf360.scenarioSet")) {
          sessionStorage.setItem(entry.key, entry.value)
          sessionStorage.setItem("sf360.scenarioSet", "1")
        }
      },
      { key: mockScenarioKey, value: "error" },
    )
  }

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: {
          accessToken: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          refreshToken: "refresh-token",
          token: "access-token",
        },
        message: "Login successful.",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
  await page.getByRole("complementary").getByRole("button", { name: "Minha Unidade" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Minha Unidade" })).toBeVisible()
}

const tab = (page: Page, name: string) => page.getByRole("tab", { name })

test.describe("overview", () => {
  test("shows which organization is in use, its data and a summary of its units", async ({ page }) => {
    await signInAndOpen(page)

    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte" })).toBeVisible()
    await expect(page.getByText("Organização em uso")).toBeVisible()
    // The organization's status reads differently from a unit's.
    await expect(page.getByText("Organização ativa").first()).toBeVisible()
    await expect(page.getByText("Associação Educacional Horizonte").first()).toBeVisible()

    const summary = page.getByRole("list", { name: "Unidades" })
    await expect(summary.getByRole("listitem")).toHaveCount(4)
    await expect(summary.getByText("Inativa")).toHaveCount(1)
  })

  test("edits a section in place, refusing an invalid value and saving a valid one", async ({ page }) => {
    await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const email = page.getByRole("textbox", { name: "E-mail institucional" })
    const save = page.getByRole("form", { name: "Contato" }).getByRole("button", { name: "Salvar" })

    await expect(save).toBeDisabled()
    await email.fill("secretaria@horizonte")
    await save.click()
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible()

    await email.fill("secretaria@horizonte.edu.br")
    await save.click()

    await expect(page.getByText("Dados da organização atualizados.")).toBeVisible()
    await expect(page.getByRole("form", { name: "Contato" })).toHaveCount(0)
    await expect(page.getByText("secretaria@horizonte.edu.br")).toBeVisible()
  })

  test("fills the address from the CEP", async ({ page }) => {
    await page.route("https://viacep.com.br/ws/01310100/json/", (route) =>
      route.fulfill({
        body: JSON.stringify({
          bairro: "Bela Vista",
          cep: "01310-100",
          localidade: "São Paulo",
          logradouro: "Avenida Paulista",
          uf: "SP",
        }),
        contentType: "application/json",
      }),
    )
    await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Endereço" }).click()
    await page.getByRole("textbox", { name: "CEP" }).fill("01310100")

    await expect(page.getByRole("textbox", { name: "Logradouro" })).toHaveValue("Avenida Paulista")
    await expect(page.getByRole("textbox", { name: /^Cidade/ })).toHaveValue("São Paulo")

    await page.getByRole("form", { name: "Endereço" }).getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText(/Avenida Paulista, 1500 - Bela Vista, São Paulo\/SP - CEP 01310-100/)).toBeVisible()
  })

  test("explains a failed load and loads again on retry", async ({ page }) => {
    await signInAndOpen(page, "error")

    await expect(page.getByText("Não foi possível carregar os dados da organização.")).toBeVisible()

    await page.evaluate((key) => sessionStorage.removeItem(key), mockScenarioKey)
    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte" })).toBeVisible()
  })

  test("says there are no units, without made-up data, and leads to registering one", async ({ page }) => {
    await signInAndOpen(page, "no-units")

    // The overview comes first in the page (every tab stays mounted, only hidden).
    await expect(page.getByText("Nenhuma unidade cadastrada").first()).toBeVisible()
    await page.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(tab(page, "Unidades")).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("dialog", { name: "Nova unidade" })).toBeVisible()
  })
})

test.describe("visual identity", () => {
  test("previews a change before saving it, and refuses an invalid file", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    const preview = page.getByRole("img", { name: "Pré-visualização" })
    await page.getByRole("textbox", { name: /^Nome de exibição/ }).fill("Colégio Horizonte Sul")
    await expect(preview).toContainText("Colégio Horizonte Sul")
    // Nothing changes elsewhere before saving.
    await tab(page, "Visão geral").click()
    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte" })).toBeVisible()
    await tab(page, "Identidade visual").click()

    await page
      .getByLabel("Logo")
      .setInputFiles({ buffer: Buffer.from("text"), mimeType: "text/plain", name: "logo.txt" })
    await expect(page.getByText("Formato de arquivo não aceito.")).toBeVisible()

    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Identidade visual atualizada.")).toBeVisible()

    await tab(page, "Visão geral").click()
    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte Sul" })).toBeVisible()
  })

  test("discards a change, going back to the current identity", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    const displayName = page.getByRole("textbox", { name: /^Nome de exibição/ })
    await displayName.fill("Outro nome")
    await page.getByRole("button", { name: "Descartar alterações" }).click()

    await expect(displayName).toHaveValue("Colégio Horizonte")
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
  })
})

test.describe("units", () => {
  test("searches and filters, telling a search without results apart from no units", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    const rows = page.getByRole("table").getByRole("row")
    await expect(rows).toHaveCount(5)

    await page.getByRole("searchbox", { name: "Buscar unidade" }).fill("caucaia")
    await expect(rows).toHaveCount(2)
    await expect(page.getByRole("cell", { exact: true, name: "Unidade Caucaia" })).toBeVisible()

    await page.getByRole("searchbox", { name: "Buscar unidade" }).fill("Recife")
    await expect(page.getByText("Nenhuma unidade encontrada para a busca ou o filtro.")).toBeVisible()
    await expect(page.getByText("Nenhuma unidade cadastrada")).toHaveCount(0)
  })

  test("shows each unit's e-mail, cutting a long one short", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    const longEmail = page.getByText("secretaria.unidade.edsonqueiroz@horizonte.edu.br")
    await expect(longEmail).toBeVisible()
    expect(await longEmail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    await expect(
      page
        .getByRole("row", { name: /Unidade Benfica/ })
        .getByText("Não informado")
        .first(),
    ).toBeVisible()
  })

  test("registers a unit, which then appears in the list and the overview", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: /^Nome da unidade/ }).fill("Unidade Messejana")
    await dialog.getByRole("textbox", { name: /^Cidade/ }).fill("Fortaleza")
    await dialog.getByRole("combobox", { name: /^UF/ }).click()
    await page.getByRole("option", { name: "CE", exact: true }).click()
    await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(page.getByText("Unidade cadastrada.")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("cell", { exact: true, name: "Unidade Messejana" })).toBeVisible()

    await tab(page, "Visão geral").click()
    await expect(page.getByRole("list", { name: "Unidades" }).getByText("Unidade Messejana")).toBeVisible()
    await expect(page.getByText("5", { exact: true })).toBeVisible()
  })

  test("asks for the required fields before registering", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: "Observações" }).fill("Só uma observação")
    await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(dialog.getByText("Preencha este campo.")).toHaveCount(3)
  })

  test("inactivates a unit with a reason, keeping it as history without edit or reactivation", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Caucaia" }).click()
    await page.getByRole("menuitem", { name: "Inativar" }).click()

    const confirm = page.getByRole("dialog", { name: "Inativar unidade?" })
    await expect(confirm).toContainText("continua no histórico da organização")
    await confirm.getByRole("textbox", { name: "Motivo da inativação" }).fill("Unidade incorporada à Aldeota.")
    await confirm.getByRole("button", { name: "Inativar" }).click()

    await expect(page.getByText("Unidade inativada.")).toBeVisible()
    const row = page.getByRole("row", { name: /Unidade Caucaia/ })
    await expect(row.getByText("Inativa")).toBeVisible()

    await page.getByRole("button", { name: "Ações de Unidade Caucaia" }).click()
    await expect(page.getByRole("menuitem", { name: "Editar" })).toBeDisabled()
    await expect(page.getByRole("menuitem", { name: "Inativar" })).toBeDisabled()
    await page.getByRole("menuitem", { name: "Visualizar" }).click()

    const details = page.getByRole("dialog", { name: "Unidade Caucaia" })
    await expect(details).toContainText("Unidade incorporada à Aldeota.")
    await expect(details.getByRole("button", { name: "Editar" })).toHaveCount(0)
  })
})
