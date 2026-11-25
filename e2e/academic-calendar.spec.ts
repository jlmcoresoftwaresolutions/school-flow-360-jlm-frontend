import { mockAcademicApi } from "./support/academic.ts"
import { expect, type Page, test } from "./support/test.ts"
import { lastCall, secretariaContext, signInAndOpen } from "./support/userAccess.ts"

// The basic academic calendar (P04 phase 7): the management prepares the items of a unit and period
// (saving never publishes), previews and publishes them as a closed snapshot (only the Admin and the
// unit's Coordenação; a revision changed meanwhile publishes nothing), withdraws a version with a reason,
// and everyone else reads only the published calendar of their own context. The backend is mocked
// (e2e/support/academic.ts); the signed-in user is an Admin unless a test says otherwise.

const calendarPath = "/academic/calendar"

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text })

const chooseContext = async (page: Page, unit: string, period: string) => {
  await page.getByRole("combobox", { name: /^Unidade/ }).click()
  await page.getByRole("option", { exact: true, name: unit }).click()
  await page.getByRole("combobox", { name: /^Período letivo/ }).click()
  await page.getByRole("option", { exact: true, name: period }).click()
}

// The preparation opens on the month view; the list is the other one.
const showList = (page: Page) => page.getByRole("button", { exact: true, name: "Lista" }).click()

// Back to the period's first month (February 2026), whatever today is.
const goToFirstMonth = async (page: Page) => {
  const previous = page.getByRole("button", { name: "Mês anterior" })
  while (await previous.isEnabled()) await previous.click()
  await expect(page.getByRole("heading", { name: "fevereiro de 2026" })).toBeVisible()
}

const day = (page: Page, date: RegExp) => page.getByRole("button", { name: date })

const asRole = (role: string) => ({
  ...secretariaContext,
  assignments: [{ ...secretariaContext.assignments[0], role }],
  roles: [role],
})

test("lists the items being prepared for a unit and period, in date order", async ({ page }) => {
  await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)

  await expect(page.getByText("Escolha a unidade e o período", { exact: true })).toBeVisible()
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")

  await expect(page.getByRole("tab", { name: "Preparação" })).toHaveAttribute("aria-selected", "true")
  await showList(page)
  await expect(page.getByRole("row").nth(1)).toContainText("Primeiras semanas")
  await expect(row(page, "Reunião de pais")).toContainText("07/02/2026")
  await expect(row(page, "Reunião de pais")).toContainText("Evento")
  await expect(row(page, "Recesso")).toContainText("09/02/2026 a 10/02/2026")
  await expect(row(page, "Recesso")).toContainText("Feriado")
})

test("prepares a new item inside the period, without publishing it", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")

  await page.getByRole("button", { name: "Novo item" }).click()
  const dialog = page.getByRole("dialog", { name: "Novo item do calendário" })
  await dialog.getByRole("button", { name: "Adicionar" }).click()
  await expect(dialog.getByRole("textbox", { name: /^Título/ })).toHaveAccessibleDescription("Informe o título.")

  await dialog.getByRole("combobox", { name: /^Tipo/ }).click()
  await page.getByRole("option", { exact: true, name: "Feriado" }).click()
  await dialog.getByRole("textbox", { name: /^Título/ }).fill("Feriado municipal")
  const start = dialog.getByRole("textbox", { name: /^Início/ })
  await start.fill("05/01/2026")
  await start.press("Tab")
  await dialog.getByRole("button", { name: "Adicionar" }).click()
  await expect(start).toHaveAccessibleDescription("A data precisa estar dentro do período letivo.")

  await start.fill("20/03/2026")
  await start.press("Tab")
  await expect(dialog.getByRole("checkbox", { name: "Unidade Aldeota" })).toBeChecked()
  await dialog.getByRole("button", { name: "Adicionar" }).click()
  await expect(page.getByText("Item adicionado à preparação. Publique para que apareça para todos.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/calendar/items")?.body).toEqual({
    category: "FERIADO",
    endDate: "2026-03-20",
    periodId: 10,
    startDate: "2026-03-20",
    title: "Feriado municipal",
    unitIds: [1],
  })
  await showList(page)
  await expect(row(page, "Feriado municipal")).toContainText("20/03/2026")
  expect(lastCall(calls, "POST", "/api/academic/calendar/publish")).toBeUndefined()
})

test("shows the items on a big month and opens a new one on the day clicked", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await goToFirstMonth(page)

  // An item shows on each of its days, in its category's color; days before the period can't be chosen.
  await expect(day(page, /, 9 de fevereiro de 2026/)).toContainText("Recesso")
  await expect(day(page, /, 10 de fevereiro de 2026/)).toContainText("Recesso")
  await expect(page.getByRole("button", { name: /, 1 de fevereiro de 2026/ })).toHaveCount(0)

  await day(page, /^Adicionar item em .*20 de fevereiro de 2026/).click()
  const dialog = page.getByRole("dialog", { name: "Novo item do calendário" })
  await expect(dialog.getByRole("textbox", { name: /^Início/ })).toHaveValue("20/02/2026")
  await expect(dialog.getByRole("textbox", { name: /^Fim/ })).toHaveValue("")
  await dialog.getByRole("combobox", { name: /^Tipo/ }).click()
  await page.getByRole("option", { exact: true, name: "Evento" }).click()
  await dialog.getByRole("textbox", { name: /^Título/ }).fill("Feira de ciências")
  await dialog.getByRole("button", { name: "Adicionar" }).click()
  await expect(page.getByText("Item adicionado à preparação.", { exact: false })).toBeVisible()
  await expect(day(page, /, 20 de fevereiro de 2026/)).toContainText("Feira de ciências")
  expect(lastCall(calls, "POST", "/api/academic/calendar/items")?.body).toMatchObject({
    endDate: "2026-02-20",
    startDate: "2026-02-20",
    title: "Feira de ciências",
  })
})

test("drags across days for a holiday of several days, and opens an item to edit", async ({ page }) => {
  await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await goToFirstMonth(page)

  await day(page, /^Adicionar item em .*18 de fevereiro de 2026/).scrollIntoViewIfNeeded()
  const from = await day(page, /^Adicionar item em .*16 de fevereiro de 2026/).boundingBox()
  const to = await day(page, /^Adicionar item em .*18 de fevereiro de 2026/).boundingBox()
  if (!from || !to) throw new Error("days not on screen")
  await page.mouse.move(from.x + from.width / 2, from.y + from.height - 8)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, { steps: 5 })
  await page.mouse.up()
  const dialog = page.getByRole("dialog", { name: "Novo item do calendário" })
  await expect(dialog.getByRole("textbox", { name: /^Início/ })).toHaveValue("16/02/2026")
  await expect(dialog.getByRole("textbox", { name: /^Fim/ })).toHaveValue("18/02/2026")
  await dialog.getByRole("button", { name: "Cancelar" }).click()

  await page.getByRole("button", { name: "Feriado: Recesso" }).first().click()
  await expect(page.getByRole("dialog", { name: "Editar Recesso" })).toBeVisible()
})

test("takes an item out of the preparation", async ({ page }) => {
  await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await showList(page)

  await page.getByRole("button", { name: "Ações de Reunião de pais" }).click()
  await page.getByRole("menuitem", { name: "Retirar da preparação" }).click()
  await page
    .getByRole("dialog", { name: "Retirar Reunião de pais da preparação?" })
    .getByRole("button", { name: "Retirar" })
    .click()
  await expect(page.getByText("Reunião de pais retirado da preparação.")).toBeVisible()
  await expect(row(page, "Reunião de pais")).toHaveCount(0)
})

test("previews and publishes the calendar, superseding the version on air", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await page.getByRole("tab", { name: "Publicação" }).click()

  const preview = page.getByRole("region", { name: "Prévia da publicação" })
  await expect(preview).toContainText("Itens3")
  await expect(preview).toContainText("Dias letivos10")
  await expect(preview).toContainText("Há mudanças desde a versão 1 publicada.")
  await expect(row(page, "Versão 1")).toContainText("Publicada")

  await preview.getByRole("button", { name: "Publicar" }).click()
  await page
    .getByRole("dialog", { name: "Publicar o calendário de Unidade Aldeota?" })
    .getByRole("button", { name: "Publicar" })
    .click()
  await expect(page.getByText("Calendário de Unidade Aldeota publicado.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/calendar/publish")?.body).toEqual({
    periodId: 10,
    units: [{ revision: "81.0-83.0-82.0", unitId: 1 }],
  })
  await expect(row(page, "Versão 2")).toContainText("Publicada")
  await expect(row(page, "Versão 1")).toContainText("Substituída")
  await expect(preview).toContainText("A versão 2 publicada já está igual à preparação.")
  await expect(preview.getByRole("button", { name: "Publicar" })).toBeDisabled()

  await page.getByRole("tab", { name: "Publicado" }).click()
  await expect(page.getByText(/^Versão 2, publicada em/)).toBeVisible()
  await expect(row(page, "Reunião de pais")).toBeVisible()
})

test("publishes nothing when the items changed after the preview", async ({ page }) => {
  const { calls } = await mockAcademicApi(page, { calendarChangedBeforePublish: true })
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await page.getByRole("tab", { name: "Publicação" }).click()

  const preview = page.getByRole("region", { name: "Prévia da publicação" })
  await preview.getByRole("button", { name: "Publicar" }).click()
  await page
    .getByRole("dialog", { name: "Publicar o calendário de Unidade Aldeota?" })
    .getByRole("button", { name: "Publicar" })
    .click()
  await expect(
    page.getByText("Os itens mudaram depois da prévia. Nada foi publicado; confira a prévia atualizada."),
  ).toBeVisible()
  await expect(row(page, "Versão 2")).toHaveCount(0)

  await preview.getByRole("button", { name: "Publicar" }).click()
  await page
    .getByRole("dialog", { name: "Publicar o calendário de Unidade Aldeota?" })
    .getByRole("button", { name: "Publicar" })
    .click()
  await expect(page.getByText("Calendário de Unidade Aldeota publicado.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/calendar/publish")?.body).toEqual({
    periodId: 10,
    units: [{ revision: "81.0-83.1-82.0", unitId: 1 }],
  })
})

test("withdraws the published version with a reason, keeping it listed", async ({ page }) => {
  const { calls } = await mockAcademicApi(page)
  await signInAndOpen(page, calendarPath)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")
  await page.getByRole("tab", { name: "Publicação" }).click()

  await row(page, "Versão 1").getByRole("button", { name: "Retirar" }).click()
  const dialog = page.getByRole("dialog", { name: "Retirar a versão 1 de Unidade Aldeota?" })
  await dialog.getByRole("button", { name: "Retirar publicação" }).click()
  await expect(dialog.getByRole("textbox", { name: /^Motivo/ })).toHaveAccessibleDescription("Informe o motivo.")

  await dialog.getByRole("textbox", { name: /^Motivo/ }).fill("Datas erradas")
  await dialog.getByRole("button", { name: "Retirar publicação" }).click()
  await expect(page.getByText("Calendário de Unidade Aldeota retirado.")).toBeVisible()
  expect(lastCall(calls, "POST", "/api/academic/calendar/versions/91/withdraw")?.body).toEqual({
    reason: "Datas erradas",
    version: 0,
  })
  await expect(row(page, "Versão 1")).toContainText("Retirada")
  await expect(row(page, "Versão 1")).toContainText("Motivo: Datas erradas")

  await page.getByRole("tab", { name: "Publicado" }).click()
  await expect(page.getByText("Nenhum calendário publicado")).toBeVisible()
})

test("lets a Secretaria prepare the calendar, but not publish it", async ({ page }) => {
  await mockAcademicApi(page, { calendarCannotPublish: true })
  await signInAndOpen(page, calendarPath, secretariaContext)
  await chooseContext(page, "Unidade Aldeota", "Ano letivo 2026")

  await expect(page.getByRole("button", { name: "Novo item" })).toBeVisible()
  await page.getByRole("tab", { name: "Publicação" }).click()
  const preview = page.getByRole("region", { name: "Prévia da publicação" })
  await expect(preview).toContainText("Só a Administração ou a Coordenação da unidade publicam o calendário.")
  await expect(preview.getByRole("button", { name: "Publicar" })).toHaveCount(0)
  await expect(row(page, "Versão 1").getByRole("button", { name: "Retirar" })).toHaveCount(0)
})

test("shows the Aluno only the published calendar of their unit", async ({ page }) => {
  const { calls } = await mockAcademicApi(page, { readOnly: true })
  await signInAndOpen(page, calendarPath, asRole("ALUNO"))

  const unit = page.getByRole("region", { name: "Unidade Aldeota" })
  await expect(unit).toContainText(/Versão 1, publicada em .* · 10 dia\(s\) letivo\(s\)/)
  await expect(unit.getByRole("row").filter({ hasText: "Primeiras semanas" })).toBeVisible()
  await expect(unit.getByRole("row").filter({ hasText: "Reunião de pais" })).toHaveCount(0)
  await expect(page.getByRole("tab")).toHaveCount(0)
  expect(lastCall(calls, "GET", "/api/academic/periods")).toBeUndefined()
})
