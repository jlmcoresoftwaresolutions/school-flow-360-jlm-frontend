import type { Request } from "@playwright/test"

import { relationshipTypes } from "./people.ts"
import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall, units } from "./userAccess.ts"

// A mocked backend for the enrollments (EPIC 6, P05 slices 0 to 2 part 1): the enrollments, the students
// that may be prepared, the history, each kept like the backend keeps them, plus every call recorded for
// the specs to check what was sent. A preparation's pendencies are worked out again on every change.

type Item = Record<string, unknown>

export type EnrollmentOptions = {
  // Someone else changes the enrollment before the first save of the guardians: it gets 409 VERSION_CONFLICT.
  conflictOnFirstSave?: boolean
  // The person only reads (a Financeiro, a Coordenação): no enrollment offers an action.
  readOnly?: boolean
}

// The guardians linked to each student in Pessoas: Ana's mother (current link) and father (ended link).
const linksByStudent: Record<number, Item[]> = {
  201: [
    {
      contactAuthorized: true,
      financialResponsible: true,
      guardianId: 301,
      guardianName: "Fernanda Souza",
      linkId: 2010,
      linkStatus: "ACTIVE",
      pedagogicalResponsible: true,
      relationshipCode: "MOTHER",
    },
    {
      contactAuthorized: false,
      financialResponsible: false,
      guardianId: 302,
      guardianName: "Gustavo Lima",
      linkId: 2011,
      linkStatus: "ENDED",
      pedagogicalResponsible: true,
      relationshipCode: "FATHER",
    },
  ],
}

const unitName = (unitId: number) => units.find((unit) => unit.schoolUnitId === unitId)?.unitName ?? null

// The students the operator may prepare, as the search answers them.
export const enrollmentStudents = [
  { code: "ALU-000001", id: 201, name: "Ana Beatriz Souza", status: "ACTIVE", unitId: 1 },
  { code: "ALU-000002", id: 202, name: "Bruno Lima", status: "ACTIVE", unitId: 2 },
  { code: "ALU-000003", id: 203, name: "Carla Dias", status: "DRAFT", unitId: 1 },
  { code: "ALU-000004", id: 204, name: "Davi Rocha", status: "INACTIVE", unitId: 2 },
]

const studentRef = (studentId: number) => {
  const student = enrollmentStudents.find((item) => item.id === studentId) as (typeof enrollmentStudents)[number]
  return {
    code: student.code,
    eligible: student.status === "ACTIVE",
    id: student.id,
    name: student.name,
    status: student.status,
  }
}

const preparation = ["DRAFT", "PENDING", "BLOCKED"]

// What a preparation still lacks, worked out like the backend does.
const pendenciesOf = (enrollment: Item) => {
  if (!preparation.includes(String(enrollment.status))) return []
  const student = enrollment.student as Item
  const parties = enrollment.parties as Item[]
  const active = parties.filter((party) => party.linkActive)
  const items: { category: string; code: string }[] = []
  if (!student.eligible) items.push({ category: "STUDENT", code: "STUDENT_NOT_ELIGIBLE" })
  if (parties.length === 0) items.push({ category: "GUARDIANS", code: "NO_PARTY" })
  if (parties.some((party) => !party.linkActive)) items.push({ category: "GUARDIANS", code: "PARTY_LINK_ENDED" })
  if (!active.some((party) => party.financial)) items.push({ category: "GUARDIANS", code: "NO_FINANCIAL_PARTY" })
  if (!active.some((party) => party.signatory)) items.push({ category: "GUARDIANS", code: "NO_SIGNATORY" })
  if (!enrollment.classContext) items.push({ category: "ACADEMIC_CONTEXT", code: "NO_CLASS" })
  return items.map((item) => ({ ...item, message: `${item.code} (backend text)` }))
}

const enrollment = (fields: Item): Item => ({
  abandonReason: null,
  classContext: null,
  createdAt: "2026-11-24T12:00:00Z",
  notEvaluated: ["DOCUMENTS", "FINANCIAL_CONDITIONS", "CONTRACT"],
  parties: [],
  updatedAt: "2026-11-24T12:00:00Z",
  version: 0,
  ...fields,
})

export const initialEnrollments = (): Item[] => [
  enrollment({
    id: 501,
    status: "DRAFT",
    student: studentRef(201),
    unitId: 1,
    unitName: unitName(1),
    updatedAt: "2026-11-24T14:00:00Z",
  }),
  enrollment({ id: 502, status: "ACTIVE", student: studentRef(202), unitId: 2, unitName: unitName(2) }),
  enrollment({
    abandonReason: "Família mudou de cidade",
    id: 503,
    status: "ABANDONED",
    student: studentRef(203),
    unitId: 1,
    unitName: unitName(1),
    updatedAt: "2026-11-23T10:00:00Z",
  }),
]

const live = ["DRAFT", "PENDING", "BLOCKED", "ACTIVE"]

const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()

const toPage = (items: Item[], query: Record<string, string>) => {
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

export const mockEnrollmentApi = async (page: Page, options: EnrollmentOptions = {}) => {
  const calls: RecordedCall[] = []
  const records = new Map<number, Item>(initialEnrollments().map((item) => [item.id as number, item]))
  const events = new Map<number, Item[]>()
  let nextId = 600
  let nextEventId = 1
  let conflictPending = Boolean(options.conflictOnFirstSave)

  const record = (request: Request) => {
    const url = new URL(request.url())
    const raw = request.postData()
    const call: RecordedCall = {
      body: raw ? request.postDataJSON() : undefined,
      headers: request.headers(),
      method: request.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    }
    calls.push(call)
    return call
  }

  const addEvent = (enrollmentId: number, fields: Item) => {
    const list = events.get(enrollmentId) ?? []
    list.unshift({
      actorName: "João Silva",
      actorUserId: 1,
      afterValue: null,
      beforeValue: null,
      changedFields: null,
      id: nextEventId++,
      occurredAt: new Date().toISOString(),
      reason: null,
      ...fields,
    })
    events.set(enrollmentId, list)
  }

  // Every enrollment starts with its creation in the history.
  ;[...records.keys()].forEach((id) =>
    addEvent(id, { action: "PREPARATION_STARTED", category: "PREPARATION", changedFields: "student" }),
  )

  // The enrollment as the backend answers it: the pendencies read again, the actions of a preparation.
  const view = (item: Item): Item => ({
    ...item,
    eligibleActions:
      !options.readOnly && preparation.includes(String(item.status))
        ? ["CHOOSE_PARTIES", "CHOOSE_CONTEXT", "ABANDON"]
        : [],
    pendencies: pendenciesOf(item),
  })

  await page.route("**/api/catalogs/relationship-types", (route) => {
    record(route.request())
    return route.fulfill(apiAnswer(relationshipTypes))
  })

  await page.route("**/api/school-units?*", (route) =>
    route.fulfill(apiAnswer({ content: units, number: 0, size: 100, totalElements: units.length, totalPages: 1 })),
  )

  await page.route(/\/api\/enrollments(\?.*)?$/, (route) => {
    const call = record(route.request())

    if (call.method === "POST") {
      const body = call.body as Item
      const student = enrollmentStudents.find((item) => item.id === body.studentId)
      if (!student) return route.fulfill(apiError(422, "ENROLLMENT_STUDENT_NOT_FOUND"))
      const existing = [...records.values()].find(
        (item) =>
          (item.student as Item).id === body.studentId &&
          item.unitId === body.unitId &&
          live.includes(String(item.status)),
      )
      if (existing) return route.fulfill(apiError(409, "ENROLLMENT_CONFLICT"))

      const id = nextId++
      const now = new Date().toISOString()
      const created = enrollment({
        createdAt: now,
        id,
        status: "DRAFT",
        student: studentRef(student.id),
        unitId: body.unitId,
        unitName: unitName(Number(body.unitId)),
        updatedAt: now,
      })
      records.set(id, created)
      addEvent(id, { action: "PREPARATION_STARTED", category: "PREPARATION", changedFields: "student" })
      return route.fulfill({ ...apiAnswer(view(created)), status: 201 })
    }

    const { q, status, unitId } = call.query
    const found = [...records.values()]
      .filter((item) => (status ? item.status === status : item.status !== "ABANDONED"))
      .filter((item) => !unitId || String(item.unitId) === unitId)
      .filter((item) => {
        if (!q) return true
        const student = item.student as Item
        return fold(student.name).includes(fold(q)) || fold(student.code).includes(fold(q))
      })
      .sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)))
      .map(view)
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  await page.route(/\/api\/enrollments\/students\/search(\?.*)?$/, (route) => {
    const call = record(route.request())
    const { q, unitId } = call.query
    const found = enrollmentStudents
      .filter((item) => !unitId || String(item.unitId) === unitId)
      .filter((item) => !q || fold(item.name).includes(fold(q)) || fold(item.code).includes(fold(q)))
      .map((item) => ({
        fullName: item.name,
        guardianStatus: null,
        id: item.id,
        matchedBy: ["NAME"],
        maskedDocument: null,
        nickname: null,
        studentCode: item.code,
        studentStatus: item.status,
        types: ["STUDENT"],
        units: [{ id: item.unitId, name: unitName(item.unitId) }],
      }))
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  await page.route(/\/api\/enrollments\/\d+(\/[a-z]+)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/enrollments\/(\d+)(?:\/([a-z]+))?/.exec(call.path) ?? []
    const current = records.get(Number(id))
    if (!current) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(view(current)))
    if (action === "history") {
      return route.fulfill(apiAnswer(toPage(events.get(Number(id)) ?? [], call.query)))
    }

    const links = linksByStudent[Number((current.student as Item).id)] ?? []
    const parties = current.parties as Item[]

    if (action === "guardians") {
      return route.fulfill(
        apiAnswer(
          links.map((link) => {
            const party = parties.find((item) => item.guardianId === link.guardianId)
            return {
              ...link,
              chosen: Boolean(party),
              financial: Boolean(party?.financial),
              signatory: Boolean(party?.signatory),
            }
          }),
        ),
      )
    }

    if (action === "parties") {
      const body = call.body as { parties: Item[]; version: number }
      if (conflictPending) {
        conflictPending = false
        records.set(Number(id), { ...current, version: Number(current.version) + 1 })
        return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      }
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const chosen = body.parties.map((party) => ({
        link: links.find((item) => item.guardianId === party.guardianId),
        party,
      }))
      if (chosen.some(({ link }) => !link || link.linkStatus !== "ACTIVE")) {
        return route.fulfill(apiError(422, "ENROLLMENT_PARTY_INVALID"))
      }
      const changed = {
        ...current,
        parties: chosen.map(({ link, party }) => ({
          financial: party.financial,
          guardianId: party.guardianId,
          guardianName: (link as Item).guardianName,
          linkActive: true,
          linkId: (link as Item).linkId,
          relationshipCode: (link as Item).relationshipCode,
          signatory: party.signatory,
        })),
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      records.set(Number(id), changed)
      addEvent(Number(id), {
        action: "PARTIES_CHANGED",
        category: "PARTY",
        changedFields: "guardians,financial,signatory",
      })
      return route.fulfill(apiAnswer(view(changed)))
    }

    if (action === "abandon") {
      const body = call.body as Item
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (!preparation.includes(String(current.status))) {
        return route.fulfill(apiError(409, "ENROLLMENT_NOT_IN_PREPARATION"))
      }
      const changed = {
        ...current,
        abandonReason: body.reason,
        status: "ABANDONED",
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      records.set(Number(id), changed)
      addEvent(Number(id), {
        action: "ABANDONED",
        afterValue: "ABANDONED",
        beforeValue: current.status,
        category: "STATUS",
        changedFields: "status",
        reason: body.reason,
      })
      return route.fulfill(apiAnswer(view(changed)))
    }

    return route.fallback()
  })

  return { calls, records }
}
