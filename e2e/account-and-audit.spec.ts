import { apiAnswer, expect, type Page, signedInUser, test } from "./support/test.ts"
import { apiError, lastCall, mockUserAccessApi, signInAndOpen } from "./support/userAccess.ts"

// The own account (sessions and profile) and the access audit (Phase 4 of the P02). The backend is
// mocked; the signed-in Admin is João Silva (id 1).

const chrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

const mockSessions = async (page: Page, options: { endStatus?: number } = {}) => {
  let sessions = [
    {
      createdAt: "2026-11-17T12:00:00Z",
      current: true,
      expiresAt: "2026-11-24T12:00:00Z",
      id: "s-1",
      userAgent: chrome,
    },
    {
      createdAt: "2026-11-15T09:00:00Z",
      current: false,
      expiresAt: "2026-11-22T09:00:00Z",
      id: "s-2",
      userAgent: iphone,
    },
  ]
  const ended: string[] = []

  await page.route("**/api/me/sessions", (route) => route.fulfill(apiAnswer(sessions)))
  await page.route(/\/api\/me\/sessions\/[\w-]+$/, (route) => {
    const id = route.request().url().split("/").pop()!
    ended.push(id)
    if (options.endStatus) return route.fulfill(apiError(options.endStatus, "SESSION_NOT_FOUND"))

    sessions = sessions.filter((session) => session.id !== id)
    return route.fulfill(apiAnswer(null))
  })

  return ended
}

test.describe("active sessions", () => {
  test("lists the own sessions and ends another one after confirming", async ({ page }) => {
    await mockUserAccessApi(page)
    const ended = await mockSessions(page)
    await signInAndOpen(page, "/access-logs/active-sessions")

    const table = page.getByRole("table")
    const current = table.getByRole("row").filter({ hasText: "Chrome no Windows" })
    await expect(current).toContainText("Esta sessão")
    await expect(current.getByRole("button")).toHaveCount(0)

    await table.getByRole("button", { name: "Encerrar a sessão Safari no iOS" }).click()
    const dialog = page.getByRole("dialog", { name: "Encerrar esta sessão?" })
    await dialog.getByRole("button", { name: "Encerrar sessão" }).click()

    await expect(page.getByText("Sessão Safari no iOS encerrada.")).toBeVisible()
    expect(ended).toEqual(["s-2"])
    await expect(table.getByRole("row").filter({ hasText: "Safari no iOS" })).toHaveCount(0)
  })

  test("says when the session had already ended", async ({ page }) => {
    await mockUserAccessApi(page)
    await mockSessions(page, { endStatus: 404 })
    await signInAndOpen(page, "/access-logs/active-sessions")

    await page.getByRole("button", { name: "Encerrar a sessão Safari no iOS" }).click()
    await page
      .getByRole("dialog", { name: "Encerrar esta sessão?" })
      .getByRole("button", { name: "Encerrar sessão" })
      .click()

    await expect(page.getByText("Essa sessão já tinha sido encerrada.")).toBeVisible()
  })
})

test.describe("my profile", () => {
  test("opens from the user menu, edits the own name and shows it in the topbar", async ({ page }) => {
    const adminAssignment = {
      assignmentId: 1,
      createdAt: "2026-10-01T12:00:00Z",
      origin: "INVITATION",
      role: "ADMIN",
      status: "ACTIVE",
      unitId: null,
      unitName: null,
    }
    const me = { ...signedInUser, assignments: [adminAssignment], phone: "+55 85 98888 1100", version: 3 }
    await mockUserAccessApi(page)
    await page.route("**/api/me", (route) => route.fulfill(apiAnswer(me)))
    let saved: unknown
    await page.route("**/api/me/profile", (route) => {
      saved = route.request().postDataJSON()
      return route.fulfill(apiAnswer({ ...me, fullName: "João Pedro Silva", version: 4 }))
    })
    await signInAndOpen(page, "/home")

    await page
      .getByRole("banner")
      .getByRole("button", { name: /^João Silva/ })
      .click()
    await page.getByRole("menuitem", { name: "Meu perfil" }).click()
    await expect(page).toHaveURL(/\/account\/profile$/)
    await expect(page.getByRole("heading", { level: 1, name: "Meu perfil" })).toBeVisible()
    await expect(page.getByText("(85) 98888-1100")).toBeVisible()
    await expect(page.getByText("Administrador · Toda a instituição").first()).toBeVisible()

    await page.getByRole("button", { name: "Editar" }).click()
    await page.getByRole("textbox", { name: /^Nome completo/ }).fill("João Pedro Silva")
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Seus dados foram atualizados.")).toBeVisible()
    expect(saved).toEqual({ fullName: "João Pedro Silva", phone: "+55 85 98888 1100", version: 3 })
    // The topbar shortens a long name, keeping the whole of it as the title.
    await expect(page.getByRole("banner").getByTitle("João Pedro Silva")).toBeVisible()
  })

  test("marks an access in an inactive unit, as the backend flags it", async ({ page }) => {
    const secretariaIn = (assignmentId: number, unitId: number, unitName: string, unitStatus: string) => ({
      assignmentId,
      createdAt: "2026-10-01T12:00:00Z",
      operative: unitStatus === "ACTIVE",
      origin: "INVITATION",
      role: "SECRETARIA",
      status: "ACTIVE",
      unitId,
      unitName,
      unitStatus,
    })
    const me = {
      ...signedInUser,
      admin: false,
      assignments: [
        secretariaIn(2, 1, "Unidade Aldeota", "ACTIVE"),
        secretariaIn(3, 9, "Unidade Messejana", "INACTIVE"),
      ],
      fullName: "Maria Souza",
      phone: null,
      roles: ["SECRETARIA"],
      userId: 2,
      version: 1,
    }
    await mockUserAccessApi(page)
    await page.route("**/api/me", (route) => route.fulfill(apiAnswer(me)))
    await signInAndOpen(page, "/account/profile", me)

    await expect(page.getByText("Secretaria · Unidade Messejana (inativa)")).toBeVisible()
    await expect(page.getByText("Secretaria · Unidade Aldeota", { exact: true })).toBeVisible()
  })
})

// Events as GET /api/audit answers them for the Admin.
const auditEvents = [
  {
    action: "SESSION_LIMIT_REACHED",
    actorEmail: "pedro.lima@horizonte.edu.br",
    actorName: "Pedro Lima",
    actorUserId: 3,
    details: null,
    entityId: "3",
    entityType: "USER",
    id: 6,
    occurredAt: "2026-11-17T18:00:00Z",
    result: "DENIED",
    schoolUnitId: null,
  },
  {
    action: "LOGOUT",
    actorEmail: "diretor@schoolflow360.com.br",
    actorName: "João Silva",
    actorUserId: 1,
    details: null,
    entityId: "6f1c2a9e-0b7d-4e55-9f3a-2c8d1e4b7a10",
    entityType: "SESSION",
    id: 5,
    occurredAt: "2026-11-17T16:00:00Z",
    result: "SUCCESS",
    schoolUnitId: null,
  },
  {
    action: "LOGIN",
    actorEmail: "diretor@schoolflow360.com.br",
    actorName: "João Silva",
    actorUserId: 1,
    details: null,
    entityId: "1",
    entityType: "USER",
    id: 4,
    occurredAt: "2026-11-17T15:00:00Z",
    result: "SUCCESS",
    schoolUnitId: null,
  },
  {
    action: "ASSIGNMENTS_CHANGED",
    actorEmail: "diretor@schoolflow360.com.br",
    actorName: "João Silva",
    actorUserId: 1,
    details: null,
    entityId: "2",
    entityType: "USER",
    id: 3,
    occurredAt: "2026-11-17T14:00:00Z",
    result: "SUCCESS",
    schoolUnitId: 1,
  },
  {
    action: "PROFILE_UPDATED",
    actorEmail: "diretor@schoolflow360.com.br",
    actorName: "João Silva",
    actorUserId: 1,
    details: "fields=fullName,phone",
    entityId: "3",
    entityType: "USER",
    id: 2,
    occurredAt: "2026-11-16T10:00:00Z",
    result: "SUCCESS",
    schoolUnitId: 2,
  },
  {
    action: "ACCESS_DENIED",
    actorEmail: "pedro.lima@horizonte.edu.br",
    actorName: "Pedro Lima",
    actorUserId: 3,
    details: null,
    entityId: "GET /api/users",
    entityType: "ENDPOINT",
    id: 1,
    occurredAt: "2026-11-15T08:30:00Z",
    result: "DENIED",
    schoolUnitId: null,
  },
]

const mockAudit = async (page: Page, options: { events?: unknown[]; status?: number } = {}) => {
  const queries: Record<string, string>[] = []
  await page.route("**/api/audit?*", (route) => {
    const query = Object.fromEntries(new URL(route.request().url()).searchParams)
    queries.push(query)
    if (options.status) return route.fulfill(apiError(options.status))

    const events = (options.events ?? auditEvents).filter(
      (event) => !query.result || (event as { result: string }).result === query.result,
    )
    return route.fulfill(apiAnswer({ items: events, page: 0, size: 20, totalElements: events.length, totalPages: 1 }))
  })
  return queries
}

test.describe("audit", () => {
  test("shows who did what, on what, where and with which result, naming changed fields but never values", async ({
    page,
  }) => {
    await mockUserAccessApi(page)
    const queries = await mockAudit(page)
    await signInAndOpen(page, "/access-logs/audit")

    const rowOf = (text: string) => page.getByRole("table").getByRole("row").filter({ hasText: text })
    await expect(rowOf("Acesso alterado")).toContainText("Maria Souza")
    await expect(rowOf("Acesso alterado")).toContainText("Unidade Aldeota")
    await expect(rowOf("Acesso alterado")).toContainText("Feito")
    await expect(rowOf("Dados pessoais alterados")).toContainText("Campos alterados: nome, telefone")
    await expect(rowOf("Acesso negado")).toContainText("Pedro Lima")
    await expect(rowOf("Acesso negado")).toContainText("GET /api/users")
    await expect(rowOf("Acesso negado")).toContainText("Negado")
    // Sign-ins, sign-outs and the session limit too (backend cd00e52); a session is never shown by its id.
    await expect(rowOf("Entrada no sistema")).toContainText("João Silva")
    await expect(rowOf("Saída do sistema")).toContainText("Sessão")
    await expect(rowOf("Saída do sistema")).not.toContainText("6f1c2a9e")
    await expect(rowOf("Limite de sessões atingido")).toContainText("Negado")

    // The last 30 days by default, as the backend's own default.
    const first = queries[0]
    const days = (Date.parse(first.to) - Date.parse(first.from)) / 86_400_000
    expect(days).toBe(30)
  })

  test("filters by result on the backend", async ({ page }) => {
    await mockUserAccessApi(page)
    const queries = await mockAudit(page)
    await signInAndOpen(page, "/access-logs/audit")
    await expect(page.getByRole("table").getByText("Acesso alterado")).toBeVisible()

    await page.getByRole("combobox", { name: /^Resultado/ }).click()
    await page.getByRole("option", { exact: true, name: "Negado" }).click()

    await expect(page.getByRole("table").getByText("Acesso alterado")).toHaveCount(0)
    expect(queries.at(-1)).toMatchObject({ page: "0", result: "DENIED" })
  })

  test("tells an empty period, a failure and a refusal apart", async ({ page }) => {
    await mockUserAccessApi(page)
    await mockAudit(page, { events: [] })
    await signInAndOpen(page, "/access-logs/audit")
    await expect(page.getByText("Nenhum evento registrado neste período.")).toBeVisible()

    await mockAudit(page, { status: 503 })
    await page.reload()
    await expect(page.getByText("Não foi possível carregar a auditoria")).toBeVisible()

    await mockAudit(page, { status: 403 })
    await page.reload()
    await expect(page.getByText("Você não tem acesso à auditoria")).toBeVisible()
  })

  test("is closed to a Secretaria", async ({ page }) => {
    await mockUserAccessApi(page)
    await signInAndOpen(page, "/access-logs/audit", {
      ...signedInUser,
      admin: false,
      fullName: "Maria Souza",
      roles: ["SECRETARIA"],
      userId: 2,
    })

    await expect(page).toHaveURL(/\/access-denied$/)
    expect(lastCall([], "GET", "/api/audit")).toBeUndefined()
  })
})
