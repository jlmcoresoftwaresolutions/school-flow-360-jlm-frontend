import type { Request, Route } from "@playwright/test"

import { apiAnswer, expect, type Page } from "./test.ts"

// A mocked backend for the users and invitations screens (P02): the units an Admin lists, the users and
// the invitations, each kept like the backend keeps them, plus every call recorded for the specs to
// check what was sent.

export const apiError = (status: number, code?: string) => ({
  body: JSON.stringify({ code, data: null, message: code ?? "Error", status: "Error", tenantId: "schoolflow_demo" }),
  contentType: "application/json",
  status,
})

const unitBase = {
  address: "",
  addressCep: null,
  addressCity: null,
  addressComplement: null,
  addressDistrict: null,
  addressNumber: null,
  addressState: null,
  addressStreet: null,
  contactEmail: "",
  contactPhone: "",
  inactivatedAt: null,
  inactivationReason: null,
  organizationId: 1,
  unitNotes: null,
  version: 0,
}

export const units = [
  { ...unitBase, operationalStatus: "ACTIVE", schoolUnitId: 1, unitName: "Unidade Aldeota" },
  { ...unitBase, operationalStatus: "ACTIVE", schoolUnitId: 2, unitName: "Unidade Caucaia" },
  { ...unitBase, operationalStatus: "INACTIVE", schoolUnitId: 4, unitName: "Unidade Benfica" },
]

const assignment = (id: number, role: string, unitId: number | null, unitName: string | null, status = "ACTIVE") => ({
  assignmentId: id,
  createdAt: "2026-10-05T13:00:00Z",
  origin: "INVITATION",
  role,
  status,
  unitId,
  unitName,
})

const userBase = { eligibleActions: [], enabled: true, locked: false, phone: null, version: 0 }

export const users = [
  {
    ...userBase,
    assignments: [assignment(1, "ADMIN", null, null)],
    email: "diretor@schoolflow360.com.br",
    fullName: "João Silva",
    id: 1,
    roles: ["ADMIN"],
    status: "ACTIVE",
  },
  {
    ...userBase,
    assignments: [
      assignment(2, "SECRETARIA", 1, "Unidade Aldeota"),
      assignment(3, "PROFESSOR", 2, "Unidade Caucaia"),
      assignment(4, "PROFESSOR", 4, "Unidade Benfica", "REVOKED"),
    ],
    email: "maria.souza@horizonte.edu.br",
    fullName: "Maria Souza",
    id: 2,
    phone: "+55 85 98888 1100",
    roles: ["SECRETARIA", "PROFESSOR"],
    status: "ACTIVE",
  },
  {
    ...userBase,
    assignments: [assignment(5, "PROFESSOR", 2, "Unidade Caucaia")],
    email: "pedro.lima@horizonte.edu.br",
    enabled: false,
    fullName: "Pedro Lima",
    id: 3,
    roles: ["PROFESSOR"],
    status: "INACTIVE",
  },
]

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

const invitationBase = {
  acceptedAt: null,
  channelResult: "SENT",
  createdAt: "2026-11-14T12:00:00Z",
  createdBy: 1,
  origin: "INVITE",
  phone: null,
}

export const invitations = [
  {
    ...invitationBase,
    assignments: [{ role: "PROFESSOR", unitId: 2 }],
    email: "ana.lima@horizonte.edu.br",
    expiresAt: hoursFromNow(30),
    fullName: "Ana Lima",
    id: 11,
    status: "PENDING",
  },
  {
    ...invitationBase,
    assignments: [{ role: "SECRETARIA", unitId: 1 }],
    channelResult: "FAILED",
    email: "bruno@horizonte.edu.br",
    expiresAt: hoursFromNow(20),
    fullName: null,
    id: 12,
    origin: "MANUAL",
    status: "PENDING",
  },
  {
    ...invitationBase,
    assignments: [{ role: "ALUNO", unitId: 4 }],
    email: "carla@horizonte.edu.br",
    expiresAt: hoursFromNow(-5),
    fullName: "Carla Dias",
    id: 13,
    status: "EXPIRED",
  },
  {
    ...invitationBase,
    acceptedAt: "2026-11-10T09:30:00Z",
    assignments: [{ role: "PROFESSOR", unitId: 2 }],
    email: "pedro.lima@horizonte.edu.br",
    expiresAt: "2026-11-11T09:00:00Z",
    fullName: "Pedro Lima",
    id: 14,
    status: "ACCEPTED",
  },
]

export type RecordedCall = {
  body?: unknown
  headers: Record<string, string>
  method: string
  path: string
  query: Record<string, string>
}

type Item = Record<string, unknown>

type UserAccessOptions = {
  // Answers the next creation (POST /api/invitations or /api/users) with this error, or with no answer.
  createFailure?: { code?: string; status: number } | "timeout"
  invitations?: Item[]
  // Answers the list of this resource with an error.
  listStatus?: { invitations?: number; users?: number }
  // Answers the next resend or cancel with this error code (409).
  stateConflict?: string
  // The units the units list answers (all of them by default, as for an Admin; a Secretaria gets its own).
  units?: Item[]
  users?: Item[]
}

const page0 = (items: Item[], query: Record<string, string>) => {
  const size = Number(query.size ?? 20)
  const page = Number(query.page ?? 0)

  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  }
}

const matches = (item: Item, query: Record<string, string>) => {
  const q = query.q?.toLowerCase()
  const assignments = item.assignments as { role: string; status?: string; unitId: number | null }[]
  if (q && !`${item.fullName ?? ""} ${item.email}`.toLowerCase().includes(q)) return false
  if (query.roleCode && !assignments.some((a) => a.role === query.roleCode)) return false
  if (query.unitId && !assignments.some((a) => a.status !== "REVOKED" && String(a.unitId) === query.unitId))
    return false
  if (query.status && item.status !== query.status) return false

  return true
}

export const mockUserAccessApi = async (page: Page, options: UserAccessOptions = {}) => {
  const calls: RecordedCall[] = []
  const userList = [...(options.users ?? users)]
  const invitationList = [...(options.invitations ?? invitations)]
  let createFailure = options.createFailure
  let stateConflict = options.stateConflict
  let nextId = 100

  const record = (request: Request) => {
    const url = new URL(request.url())
    const call: RecordedCall = {
      body: request.postData() ? request.postDataJSON() : undefined,
      headers: request.headers(),
      method: request.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    }
    calls.push(call)
    return call
  }

  await page.route("**/api/school-units?*", (route) => {
    record(route.request())
    const listed = options.units ?? units
    return route.fulfill(
      apiAnswer({ content: listed, number: 0, size: 100, totalElements: listed.length, totalPages: 1 }),
    )
  })

  await page.route("**/api/users?*", (route) => {
    const call = record(route.request())
    if (options.listStatus?.users) return route.fulfill(apiError(options.listStatus.users))

    return route.fulfill(
      apiAnswer(
        page0(
          userList.filter((user) => matches(user, call.query)),
          call.query,
        ),
      ),
    )
  })

  await page.route(/\/api\/users\/\d+$/, (route) => {
    const call = record(route.request())
    const user = userList.find((item) => `/api/users/${item.id}` === call.path)
    if (!user) return route.fulfill(apiError(404, "USER_NOT_FOUND"))

    return route.fulfill(apiAnswer({ ...user, eligibleActions: ["EDIT_ASSIGNMENTS", "REVOKE", "INACTIVATE"] }))
  })

  const create = (origin: "INVITE" | "MANUAL") => async (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback()

    const call = record(route.request())
    const failure = createFailure
    createFailure = undefined
    if (failure === "timeout") return route.abort("timedout")
    if (failure) return route.fulfill(apiError(failure.status, failure.code))

    const body = call.body as Item
    const created = {
      ...invitationBase,
      assignments: (body.assignments as { roleCode: string; schoolUnitId: number | null }[]).map((item) => ({
        role: item.roleCode,
        unitId: item.schoolUnitId,
      })),
      createdAt: new Date().toISOString(),
      email: body.email,
      expiresAt: hoursFromNow(48),
      fullName: body.fullName ?? null,
      id: nextId++,
      origin,
      phone: body.phone ?? null,
      status: "PENDING",
    }
    invitationList.unshift(created)

    return route.fulfill({ ...apiAnswer(created), status: 201 })
  }

  await page.route(/\/api\/invitations$/, create("INVITE"))
  await page.route(/\/api\/users$/, create("MANUAL"))

  await page.route("**/api/invitations?*", (route) => {
    const call = record(route.request())
    if (options.listStatus?.invitations) return route.fulfill(apiError(options.listStatus.invitations))

    return route.fulfill(
      apiAnswer(
        page0(
          invitationList.filter((item) => matches(item, call.query)),
          call.query,
        ),
      ),
    )
  })

  await page.route(/\/api\/invitations\/\d+\/(resend|cancel)$/, (route) => {
    const call = record(route.request())
    const [, id, action] = call.path.match(/\/api\/invitations\/(\d+)\/(resend|cancel)$/)!
    const conflict = stateConflict
    stateConflict = undefined
    if (conflict) return route.fulfill(apiError(409, conflict))

    const index = invitationList.findIndex((item) => String(item.id) === id)
    const invitation = invitationList[index]
    if (action === "cancel") {
      invitationList[index] = { ...invitation, status: "CANCELLED" }
      return route.fulfill(apiAnswer(invitationList[index]))
    }

    invitationList[index] = { ...invitation, status: "SUPERSEDED" }
    const fresh = {
      ...invitation,
      createdAt: new Date().toISOString(),
      expiresAt: hoursFromNow(48),
      id: nextId++,
      status: "PENDING",
    }
    invitationList.unshift(fresh)
    return route.fulfill({ ...apiAnswer(fresh), status: 201 })
  })

  return { calls, invitations: invitationList }
}

// Signs in (the backend mocked) as `context` would - /api/me answers it - and opens `path`.
export const signInAndOpen = async (page: Page, path: string, context?: Item) => {
  if (context) await page.route("**/api/me", (route) => route.fulfill(apiAnswer(context)))
  await page.route("**/api/auth/login", (route) =>
    route.fulfill(
      apiAnswer({
        accessToken: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        refreshToken: "refresh-token",
        token: "access-token",
      }),
    ),
  )

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.goto(path)
}

// A Secretaria of Unidade Aldeota, who is also a Professor at Unidade Caucaia.
export const secretariaContext = {
  admin: false,
  assignments: [
    {
      assignmentId: 2,
      createdAt: "2026-10-05T13:00:00Z",
      origin: "INVITATION",
      role: "SECRETARIA",
      status: "ACTIVE",
      unitId: 1,
      unitName: "Unidade Aldeota",
    },
    {
      assignmentId: 3,
      createdAt: "2026-10-05T13:00:00Z",
      origin: "INVITATION",
      role: "PROFESSOR",
      status: "ACTIVE",
      unitId: 2,
      unitName: "Unidade Caucaia",
    },
  ],
  email: "maria.souza@horizonte.edu.br",
  fullName: "Maria Souza",
  roles: ["SECRETARIA", "PROFESSOR"],
  userId: 2,
}

// The last call to a path (and method), for the specs to check what was sent.
export const lastCall = (calls: RecordedCall[], method: string, path: string | RegExp) =>
  [...calls]
    .reverse()
    .find((call) => call.method === method && (typeof path === "string" ? call.path === path : path.test(call.path)))
