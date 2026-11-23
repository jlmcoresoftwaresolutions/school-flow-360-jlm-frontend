import type { Request } from "@playwright/test"

import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall, units } from "./userAccess.ts"

// A mocked backend for the academic structure screens (P04): the units an Admin lists and the school
// periods, filtered and paged like the backend does it and kept like it keeps them (every change bumps
// the version), plus every call recorded for the specs to check what was sent.

type Item = Record<string, unknown>

const managerPeriodActions: Record<string, string[]> = {
  ACTIVE: ["EDIT", "CLOSE"],
  CLOSED: [],
  CONFIGURED: ["EDIT", "ACTIVATE"],
}

const period = (fields: Item): Item => ({
  closeReason: null,
  updatedAt: "2026-11-20T12:00:00Z",
  version: 0,
  ...fields,
  eligibleActions: managerPeriodActions[String(fields.status)],
})

// The periods: an active year with classes and teacher links (it can't be closed), a configured
// semester, a closed year and an active year with nothing depending on it.
export const periods = [
  period({
    endDate: "2026-12-18",
    id: 10,
    kind: "ANNUAL",
    name: "Ano letivo 2026",
    referenceYear: 2026,
    startDate: "2026-02-02",
    status: "ACTIVE",
    unitIds: [1, 2],
  }),
  period({
    endDate: "2027-07-02",
    id: 11,
    kind: "SEMESTER",
    name: "1º semestre 2027",
    referenceYear: 2027,
    startDate: "2027-02-01",
    status: "CONFIGURED",
    unitIds: [1],
  }),
  period({
    closeReason: "Fim do ano letivo",
    endDate: "2025-12-19",
    id: 12,
    kind: "ANNUAL",
    name: "Ano letivo 2025",
    referenceYear: 2025,
    startDate: "2025-02-03",
    status: "CLOSED",
    unitIds: [1],
  }),
  period({
    endDate: "2027-12-17",
    id: 13,
    kind: "ANNUAL",
    name: "Ano letivo 2027",
    referenceYear: 2027,
    startDate: "2027-02-01",
    status: "ACTIVE",
    unitIds: [2],
  }),
]

// What blocks closing each period, as the backend words it (English sentences), and its active offers.
const periodImpacts: Record<number, { activeOffers: number; blockers: string[] }> = {
  10: { activeOffers: 4, blockers: ["2 active class(es) in this period", "1 teacher link(s) that have not ended"] },
  13: { activeOffers: 3, blockers: [] },
}

// The catalog of the institution: three stages (the middle one with active grades), grades of two
// stages (the first with active offers), and three subjects (the first taught by offers and classes).
const catalogActions = (kind: string, status: unknown) => {
  if (status !== "ACTIVE") return ["EDIT", "ACTIVATE"]
  return kind === "stages" ? ["EDIT", "ADD_GRADE", "INACTIVATE"] : ["EDIT", "INACTIVATE"]
}

const catalogItem = (kind: string, fields: Item): Item => ({
  version: 0,
  ...fields,
  eligibleActions: catalogActions(kind, fields.status),
})

export const stages = [
  catalogItem("stages", { id: 1, name: "Educação Infantil", sortOrder: 1, status: "ACTIVE" }),
  catalogItem("stages", { id: 2, name: "Ensino Fundamental", sortOrder: 2, status: "ACTIVE" }),
  catalogItem("stages", { id: 3, name: "Ensino Médio", sortOrder: 3, status: "INACTIVE" }),
]

export const grades = [
  catalogItem("grades", { id: 21, name: "1º ano", sortOrder: 1, stageId: 2, status: "ACTIVE" }),
  catalogItem("grades", { id: 22, name: "2º ano", sortOrder: 2, stageId: 2, status: "ACTIVE" }),
  catalogItem("grades", { id: 23, name: "Infantil 5", sortOrder: 5, stageId: 1, status: "ACTIVE" }),
]

export const subjects = [
  catalogItem("subjects", {
    code: "MAT",
    description: "Matemática do Fundamental",
    id: 31,
    name: "Matemática",
    status: "ACTIVE",
  }),
  catalogItem("subjects", { code: "POR", description: null, id: 32, name: "Língua Portuguesa", status: "ACTIVE" }),
  catalogItem("subjects", { code: "ART", description: null, id: 33, name: "Artes", status: "INACTIVE" }),
]

// What blocks inactivating each catalog item, as the backend words it.
const catalogBlockers: Record<string, string[]> = {
  "grades/21": ["2 active offer(s) of this grade"],
  "stages/2": ["2 active grade(s) of this stage"],
  "subjects/31": ["3 active offer(s) that teach this subject", "2 class(es) that teach this subject"],
}

// The offers: the 1st year in Aldeota in 2026 (with classes, so it can't be inactivated), the 2nd year
// there without subjects yet, and an inactive offer in Caucaia.
const offerActions = (status: unknown) => (status === "ACTIVE" ? ["EDIT_SUBJECTS", "INACTIVATE"] : ["ACTIVATE"])

const offer = (fields: Item): Item => ({ version: 0, ...fields, eligibleActions: offerActions(fields.status) })

export const offers = [
  offer({ gradeId: 21, id: 41, periodId: 10, status: "ACTIVE", subjectIds: [31, 32], unitId: 1 }),
  offer({ gradeId: 22, id: 42, periodId: 10, status: "ACTIVE", subjectIds: [], unitId: 1 }),
  offer({ gradeId: 21, id: 43, periodId: 13, status: "INACTIVE", subjectIds: [31], unitId: 2 }),
]

const offerBlockers: Record<number, string[]> = {
  41: ["2 class(es) of this offer"],
}

// The rooms: two in Aldeota (one inactive, one used by a class) and one in Caucaia.
const roomActions = (status: unknown) => (status === "ACTIVE" ? ["RENAME", "INACTIVATE"] : ["RENAME", "ACTIVATE"])

const room = (fields: Item): Item => ({ version: 0, ...fields, eligibleActions: roomActions(fields.status) })

export const rooms = [
  room({ id: 51, name: "Sala 101", status: "ACTIVE", unitId: 1 }),
  room({ id: 52, name: "Laboratório", status: "INACTIVE", unitId: 1 }),
  room({ id: 53, name: "Sala 201", status: "ACTIVE", unitId: 2 }),
]

const roomBlockers: Record<number, string[]> = {
  51: ["1 class(es) that use this room"],
}

// The classes: an active one in Aldeota (whose inactivation the silent enrollment source blocks), one in
// preparation without capacity nor teacher, one in preparation on Caucaia's inactive offer, and one in
// preparation ready to be activated.
const classBase = (fields: Item): Item => ({
  eligibleForEnrollment: false,
  noPhysicalRoom: false,
  pendencies: [],
  roomId: null,
  updatedAt: "2026-11-20T12:00:00Z",
  version: 0,
  ...fields,
})

export const classes = [
  classBase({
    capacity: 30,
    code: "1A-MAN",
    eligibleForEnrollment: true,
    gradeId: 21,
    id: 61,
    name: "1º ano A",
    offerId: 41,
    periodId: 10,
    roomId: 51,
    shift: "MANHA",
    status: "ACTIVE",
    subjectIds: [31, 32],
    unitId: 1,
  }),
  classBase({
    capacity: 0,
    code: "1B-TAR",
    gradeId: 21,
    id: 62,
    name: "1º ano B",
    noPhysicalRoom: true,
    offerId: 41,
    pendencies: ["NO_TEACHER"],
    periodId: 10,
    shift: "TARDE",
    status: "PREPARATION",
    subjectIds: [31],
    unitId: 1,
  }),
  classBase({
    capacity: 25,
    code: "1A-NOI",
    gradeId: 21,
    id: 63,
    name: "1º ano Noite",
    offerId: 43,
    pendencies: ["NO_TEACHER"],
    periodId: 13,
    roomId: 53,
    shift: "NOITE",
    status: "PREPARATION",
    subjectIds: [31],
    unitId: 2,
  }),
  classBase({
    capacity: 28,
    code: "2A-MAN",
    gradeId: 22,
    id: 64,
    name: "2º ano A",
    offerId: 42,
    pendencies: ["NO_TEACHER"],
    periodId: 10,
    roomId: 51,
    shift: "MANHA",
    status: "PREPARATION",
    subjectIds: [],
    unitId: 1,
  }),
]

const classActions: Record<string, string[]> = {
  ACTIVE: ["EDIT", "ADD_TEACHER", "INACTIVATE"],
  INACTIVE: ["EDIT", "ACTIVATE"],
  PREPARATION: ["EDIT", "ACTIVATE"],
}

const shiftLabels: Record<string, string> = { INTEGRAL: "Integral", MANHA: "Manhã", NOITE: "Noite", TARDE: "Tarde" }

const notEligible = (message: string) => ({
  body: JSON.stringify({ code: "ACADEMIC_NOT_ELIGIBLE", data: null, message, status: "Error" }),
  contentType: "application/json",
  status: 422,
})

// The Professors of each unit (people of Usuários, with or without a login), and the teacher links of the
// active class: a current one in Matemática and one ended in Língua Portuguesa.
export const teachers = [
  { fullName: "Carla Mendes", hasAccess: true, unitId: 1, userId: 501 },
  { fullName: "Paulo Rocha", hasAccess: false, unitId: 1, userId: 502 },
  { fullName: "Carla Souza", hasAccess: true, unitId: 1, userId: 503 },
  { fullName: "Rafael Lima", hasAccess: true, unitId: 2, userId: 504 },
]

export const teacherLinks: Item[] = [
  {
    classId: 61,
    endDate: null,
    endReason: null,
    endedByCommand: false,
    id: 71,
    joint: false,
    startDate: "2026-02-02",
    subjectId: 31,
    teacherName: "Carla Mendes",
    teacherUserId: 501,
    version: 0,
  },
  {
    classId: 61,
    endDate: "2026-06-30",
    endReason: "Troca de professor",
    endedByCommand: true,
    id: 72,
    joint: false,
    startDate: "2026-02-02",
    subjectId: 32,
    teacherName: "Paulo Rocha",
    teacherUserId: 502,
    version: 1,
  },
]

const isoToday = () => new Date().toLocaleDateString("en-CA")

// The history of the active class (newest first) and its students, when the enrollment answers.
export const classEvents: Item[] = [
  {
    action: "CAPACITY_REVIEWED",
    actorName: "João Silva",
    actorUserId: 1,
    after: "30",
    before: "28",
    category: "CAPACITY",
    changedFields: ["capacity"],
    classId: 61,
    id: 904,
    objectId: 61,
    objectType: "CLASS",
    occurredAt: "2026-03-10T13:00:00Z",
    reason: "Sala maior",
  },
  {
    action: "TEACHER_LINK_CREATED",
    actorName: "João Silva",
    actorUserId: 1,
    after: "2026-02-02..",
    before: null,
    category: "TEACHER_LINK",
    changedFields: ["teacher", "subject", "startDate", "endDate", "joint"],
    classId: 61,
    id: 903,
    objectId: 71,
    objectType: "TEACHER_LINK",
    occurredAt: "2026-02-01T12:00:00Z",
    reason: null,
  },
  {
    action: "CLASS_ACTIVATED",
    actorName: null,
    actorUserId: null,
    after: "ACTIVE",
    before: "PREPARATION",
    category: "STATUS",
    changedFields: ["status"],
    classId: 61,
    id: 902,
    objectId: 61,
    objectType: "CLASS",
    occurredAt: "2026-01-20T12:00:00Z",
    reason: null,
  },
  {
    action: "CLASS_CREATED",
    actorName: "João Silva",
    actorUserId: 1,
    after: null,
    before: null,
    category: "CONFIG",
    changedFields: ["code", "name", "shift", "room", "capacity", "subjects"],
    classId: 61,
    id: 901,
    objectId: 61,
    objectType: "CLASS",
    occurredAt: "2026-01-15T12:00:00Z",
    reason: null,
  },
]

export const classStudents = [
  { enrollmentId: 801, name: "Ana Beatriz Lima", status: "ACTIVE", studentId: 11 },
  { enrollmentId: 802, name: "Bruno Costa", status: "ACTIVE", studentId: 12 },
  { enrollmentId: 803, name: "Carlos Eduardo Reis", status: "LOCKED", studentId: 13 },
]

// The calendar of Unidade Aldeota in 2026: a school year, a holiday shared with Caucaia and a parents'
// meeting added after version 1 was published (so the preparation differs from what is on air).
export const calendarItems: Item[] = [
  {
    category: "DIA_LETIVO",
    description: null,
    endDate: "2026-02-13",
    id: 81,
    periodId: 10,
    startDate: "2026-02-02",
    status: "ACTIVE",
    title: "Primeiras semanas",
    unitIds: [1],
    version: 0,
  },
  {
    category: "FERIADO",
    description: "Sem aulas",
    endDate: "2026-02-10",
    id: 82,
    periodId: 10,
    startDate: "2026-02-09",
    status: "ACTIVE",
    title: "Recesso",
    unitIds: [1, 2],
    version: 0,
  },
  {
    category: "EVENTO",
    description: null,
    endDate: "2026-02-07",
    id: 83,
    periodId: 10,
    startDate: "2026-02-07",
    status: "ACTIVE",
    title: "Reunião de pais",
    unitIds: [1],
    version: 0,
  },
]

const dayList = (start: string, end: string) => {
  const days: string[] = []
  for (
    let day = new Date(`${start}T00:00:00Z`);
    day <= new Date(`${end}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    days.push(day.toISOString().slice(0, 10))
  }
  return days
}

// Only a school day counts; a holiday takes its days off; an event never changes the count.
const schoolDaysOf = (items: Item[]) => {
  const school = new Set(
    items
      .filter((item) => item.category === "DIA_LETIVO")
      .flatMap((item) => dayList(String(item.startDate), String(item.endDate))),
  )
  items
    .filter((item) => item.category === "FERIADO")
    .forEach((item) => dayList(String(item.startDate), String(item.endDate)).forEach((day) => school.delete(day)))
  return school.size
}

const snapshotOf = (items: Item[]) =>
  items.map((item) => ({
    category: item.category,
    description: item.description,
    endDate: item.endDate,
    id: item.id,
    startDate: item.startDate,
    title: item.title,
  }))

const revisionOf = (items: Item[]) =>
  items.map((item) => `${String(item.id)}.${String(item.version)}`).join("-") || "none"

export const calendarVersions: Item[] = [
  {
    id: 91,
    items: snapshotOf(calendarItems.slice(0, 2)),
    periodId: 10,
    publishedAt: "2026-01-25T12:00:00Z",
    revision: "81.0-82.0",
    schoolDays: schoolDaysOf(calendarItems.slice(0, 2)),
    status: "PUBLISHED",
    unitId: 1,
    version: 0,
    versionNo: 1,
    withdrawReason: null,
  },
]

const dependencyError = (blockers: string[]) => ({
  body: JSON.stringify({
    code: "ACADEMIC_DEPENDENCY_ACTIVE",
    data: null,
    message: `This change depends on regularizing: ${blockers.join(", ")}.`,
    status: "Error",
  }),
  contentType: "application/json",
  status: 409,
})

type AcademicOptions = {
  // Someone else changes this catalog item ("subjects/32") before its first save (409 VERSION_CONFLICT).
  changedCatalogItem?: string
  // Someone else changes this class before its first change (409 VERSION_CONFLICT).
  changedClassId?: number
  // Someone else changes this offer before its first change (409 VERSION_CONFLICT).
  changedOfferId?: number
  // Someone else changes this period before the first save of the spec (409 VERSION_CONFLICT).
  changedPeriodId?: number
  // Someone else changes this room before its first change (409 VERSION_CONFLICT).
  changedRoomId?: number
  // The calendar's items change after the preview, before the first publication (409 VERSION_CONFLICT).
  calendarChangedBeforePublish?: boolean
  // The signed-in person prepares the calendar but doesn't publish it (a Secretaria).
  calendarCannotPublish?: boolean
  // The academic structure hasn't started: the overview answers EMPTY.
  emptyStructure?: boolean
  // The enrollment answers (occupation, seats and students); otherwise UNAVAILABLE, as today.
  enrollmentAvailable?: boolean
  // The caller only reads (a Professor): no item comes with an action.
  readOnly?: boolean
}

const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

const overlaps = (first: Item, second: Item) =>
  String(first.startDate) <= String(second.endDate) && String(second.startDate) <= String(first.endDate)

export const mockAcademicApi = async (page: Page, options: AcademicOptions = {}) => {
  const calls: RecordedCall[] = []
  const periodList = periods.map((item) => ({ ...item }))
  let nextPeriodId = 20
  let periodChanged = false
  let classChanged = false
  let offerChanged = false
  let roomChanged = false

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

  // What the caller sees of a period: a read-only caller gets no action.
  const view = (item: Item) => (options.readOnly ? { ...item, eligibleActions: [] } : item)

  await page.route("**/api/school-units?*", (route) => {
    record(route.request())
    return route.fulfill(
      apiAnswer({ content: units, number: 0, size: 100, totalElements: units.length, totalPages: 1 }),
    )
  })

  await page.route("**/api/academic/periods?*", (route) => {
    const call = record(route.request())
    const { q, status, year } = call.query
    const found = periodList
      .filter((item) => !q || fold(item.name).includes(fold(q)))
      .filter((item) => !status || item.status === status)
      .filter((item) => !year || String(item.referenceYear) === year)
      .sort((first, second) => String(second.startDate).localeCompare(String(first.startDate)))
      .map(view)
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  // The checks the backend makes on a period's data (create and edition).
  const refuse = (body: Item, exceptId?: number) => {
    if (String(body.startDate) > String(body.endDate)) return apiError(422, "ACADEMIC_INVALID_RANGE")
    const others = periodList.filter((item) => item.id !== exceptId)
    const sameName = others.some(
      (item) => fold(item.name) === fold(body.name) && item.referenceYear === body.referenceYear,
    )
    if (sameName) return apiError(409, "ACADEMIC_DUPLICATE_CODE")
    const overlap = others.some(
      (item) =>
        item.kind === body.kind &&
        (item.unitIds as number[]).some((unitId) => (body.unitIds as number[]).includes(unitId)) &&
        overlaps(item, body),
    )
    if (overlap) return apiError(409, "ACADEMIC_PERIOD_OVERLAP")
    return null
  }

  await page.route("**/api/academic/periods", (route) => {
    const call = record(route.request())
    const body = call.body as Item
    const refusal = refuse(body)
    if (refusal) return route.fulfill(refusal)

    const created = period({ ...body, id: nextPeriodId++, status: "CONFIGURED", version: 0 })
    periodList.push(created)
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/academic\/periods\/\d+(\/(impact|activate|close))?$/, (route) => {
    const call = record(route.request())
    const [, id, , action] = /\/api\/academic\/periods\/(\d+)(\/(impact|activate|close))?$/.exec(call.path) ?? []
    const index = periodList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = periodList[index]

    if (action === "impact") {
      const impact = periodImpacts[Number(id)] ?? { activeOffers: 0, blockers: [] }
      return route.fulfill(apiAnswer({ ...impact, canClose: impact.blockers.length === 0, periodId: Number(id) }))
    }
    if (call.method === "GET") return route.fulfill(apiAnswer(view(current)))

    // Someone else renames the period first: the version moves on.
    if (options.changedPeriodId === current.id && !periodChanged) {
      periodChanged = true
      periodList[index] = {
        ...current,
        name: `${String(current.name)} (revisado)`,
        version: Number(current.version) + 1,
      }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action) {
      if (current.status === "CLOSED") return route.fulfill(apiError(422, "ACADEMIC_NOT_ELIGIBLE"))
      const refusal = refuse(body, Number(id))
      if (refusal) return route.fulfill(refusal)
      const updated = period({ ...current, ...body, version: Number(current.version) + 1 })
      periodList[index] = updated
      return route.fulfill(apiAnswer(updated))
    }

    if (action === "activate") {
      if (current.status !== "CONFIGURED") return route.fulfill(apiError(422, "ACADEMIC_NOT_ELIGIBLE"))
      periodList[index] = period({ ...current, status: "ACTIVE", version: Number(current.version) + 1 })
      return route.fulfill(apiAnswer(periodList[index]))
    }

    const blockers = periodImpacts[Number(id)]?.blockers ?? []
    if (blockers.length > 0) {
      return route.fulfill({
        body: JSON.stringify({
          code: "ACADEMIC_DEPENDENCY_ACTIVE",
          data: null,
          message: `This change depends on regularizing: ${blockers.join(", ")}.`,
          status: "Error",
        }),
        contentType: "application/json",
        status: 409,
      })
    }
    periodList[index] = period({
      ...current,
      closeReason: body.reason,
      status: "CLOSED",
      version: Number(current.version) + 1,
    })
    return route.fulfill(apiAnswer(periodList[index]))
  })

  // The catalog: lists (search without accents, status and stage filters), creates with the uniqueness
  // rules, editions with the version, impacts, inactivations (refused while something depends on the
  // item) and reactivations.
  const catalog: Record<string, Item[]> = {
    grades: grades.map((item) => ({ ...item })),
    stages: stages.map((item) => ({ ...item })),
    subjects: subjects.map((item) => ({ ...item })),
  }
  let nextCatalogId = 100
  let catalogChanged = false

  const isDuplicate = (kind: string, body: Item, exceptId?: number) =>
    catalog[kind].some((item) => {
      if (item.id === exceptId) return false
      if (kind === "subjects") return fold(item.code) === fold(body.code)
      if (kind === "grades") return item.stageId === body.stageId && fold(item.name) === fold(body.name)
      return fold(item.name) === fold(body.name)
    })

  await page.route(/\/api\/academic\/(stages|grades|subjects)(\?.*)?$/, (route) => {
    const call = record(route.request())
    const kind = /\/api\/academic\/(stages|grades|subjects)$/.exec(call.path)?.[1] ?? ""
    if (call.method === "GET") {
      const { q, stageId, status } = call.query
      const found = catalog[kind]
        .filter((item) => !q || fold(item.name).includes(fold(q)) || fold(item.code) === fold(q))
        .filter((item) => !status || item.status === status)
        .filter((item) => !stageId || String(item.stageId) === stageId)
        .map(view)
      return route.fulfill(apiAnswer(toPage(found, call.query)))
    }

    const body = call.body as Item
    if (isDuplicate(kind, body)) return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
    const created = catalogItem(kind, { ...body, id: nextCatalogId++, status: "ACTIVE", version: 0 })
    catalog[kind].push(created)
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/academic\/(stages|grades|subjects)\/\d+(\/(impact|activate|inactivate))?$/, (route) => {
    const call = record(route.request())
    const [, kind, id, , action] =
      /\/api\/academic\/(stages|grades|subjects)\/(\d+)(\/(impact|activate|inactivate))?$/.exec(call.path) ?? []
    const list = catalog[kind]
    const index = list.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = list[index]
    const blockers = catalogBlockers[`${kind}/${id}`] ?? []

    if (action === "impact") {
      return route.fulfill(apiAnswer({ blockers, canInactivate: blockers.length === 0, id: Number(id) }))
    }
    if (call.method === "GET") return route.fulfill(apiAnswer(view(current)))

    if (options.changedCatalogItem === `${kind}/${id}` && !catalogChanged) {
      catalogChanged = true
      list[index] = { ...current, name: `${String(current.name)} (revisada)`, version: Number(current.version) + 1 }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action) {
      if (isDuplicate(kind, { ...current, ...body }, Number(id))) {
        return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
      }
      list[index] = catalogItem(kind, { ...current, ...body, version: Number(current.version) + 1 })
      return route.fulfill(apiAnswer(list[index]))
    }

    if (action === "inactivate" && blockers.length > 0) return route.fulfill(dependencyError(blockers))
    const status = action === "inactivate" ? "INACTIVE" : "ACTIVE"
    list[index] = catalogItem(kind, { ...current, status, version: Number(current.version) + 1 })
    return route.fulfill(apiAnswer(list[index]))
  })

  await page.route(/\/api\/academic\/catalog\/search\?.*$/, (route) => {
    const call = record(route.request())
    const q = fold(call.query.q)
    const like = (item: Item) => fold(item.name).includes(q)
    return route.fulfill(
      apiAnswer({
        grades: catalog.grades.filter(like),
        stages: catalog.stages.filter(like),
        subjects: catalog.subjects.filter(like),
      }),
    )
  })

  // The offers: filtered by unit, period, grade and status; each combination of unit, period and grade
  // exists once; the subjects are replaced as a whole (only active ones); inactivating is refused while a
  // class depends on the offer, and reactivating while its period is closed.
  const offerList = offers.map((item) => ({ ...item }))
  let nextOfferId = 140

  await page.route(/\/api\/academic\/offers(\?.*)?$/, (route) => {
    const call = record(route.request())
    if (call.method === "GET") {
      const { gradeId, periodId, status, unitId } = call.query
      const found = offerList
        .filter((item) => !unitId || String(item.unitId) === unitId)
        .filter((item) => !periodId || String(item.periodId) === periodId)
        .filter((item) => !gradeId || String(item.gradeId) === gradeId)
        .filter((item) => !status || item.status === status)
        .map(view)
      return route.fulfill(apiAnswer(toPage(found, call.query)))
    }

    const body = call.body as Item
    const repeated = offerList.some(
      (item) => item.unitId === body.unitId && item.periodId === body.periodId && item.gradeId === body.gradeId,
    )
    if (repeated) return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
    const created = offer({ ...body, id: nextOfferId++, status: "ACTIVE", subjectIds: [] })
    offerList.push(created)
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/academic\/offers\/\d+(\/(subjects|activate|inactivate))?$/, (route) => {
    const call = record(route.request())
    const [, id, , action] = /\/api\/academic\/offers\/(\d+)(\/(subjects|activate|inactivate))?$/.exec(call.path) ?? []
    const index = offerList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = offerList[index]
    if (call.method === "GET") return route.fulfill(apiAnswer(view(current)))

    if (options.changedOfferId === Number(id) && !offerChanged) {
      offerChanged = true
      offerList[index] = { ...current, subjectIds: [32], version: Number(current.version) + 1 }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    const blockers = offerBlockers[Number(id)] ?? []
    if (action === "inactivate" && blockers.length > 0) return route.fulfill(dependencyError(blockers))

    const changes: Item = action === "subjects" ? { subjectIds: body.subjectIds } : {}
    if (action === "activate") changes.status = "ACTIVE"
    if (action === "inactivate") changes.status = "INACTIVE"
    offerList[index] = offer({ ...current, ...changes, version: Number(current.version) + 1 })
    return route.fulfill(apiAnswer(offerList[index]))
  })

  // The rooms of a unit: the name is unique in the unit (without case or accents), a room never changes
  // unit, and inactivating is refused while a class uses it.
  const roomList = rooms.map((item) => ({ ...item }))
  let nextRoomId = 150

  const isRoomDuplicate = (body: Item, exceptId?: number) =>
    roomList.some((item) => item.id !== exceptId && item.unitId === body.unitId && fold(item.name) === fold(body.name))

  await page.route(/\/api\/academic\/rooms(\?.*)?$/, (route) => {
    const call = record(route.request())
    if (call.method === "GET") {
      return route.fulfill(apiAnswer(roomList.filter((item) => String(item.unitId) === call.query.unitId).map(view)))
    }

    const body = call.body as Item
    if (isRoomDuplicate(body)) return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
    const created = room({ ...body, id: nextRoomId++, status: "ACTIVE" })
    roomList.push(created)
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/academic\/rooms\/\d+(\/(activate|inactivate))?$/, (route) => {
    const call = record(route.request())
    const [, id, , action] = /\/api\/academic\/rooms\/(\d+)(\/(activate|inactivate))?$/.exec(call.path) ?? []
    const index = roomList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = roomList[index]

    if (options.changedRoomId === Number(id) && !roomChanged) {
      roomChanged = true
      roomList[index] = { ...current, name: `${String(current.name)} (revisada)`, version: Number(current.version) + 1 }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action) {
      if (isRoomDuplicate({ ...body, unitId: current.unitId }, Number(id))) {
        return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
      }
      roomList[index] = room({ ...current, name: body.name, version: Number(current.version) + 1 })
      return route.fulfill(apiAnswer(roomList[index]))
    }

    const blockers = roomBlockers[Number(id)] ?? []
    if (action === "inactivate" && blockers.length > 0) return route.fulfill(dependencyError(blockers))
    const status = action === "inactivate" ? "INACTIVE" : "ACTIVE"
    roomList[index] = room({ ...current, status, version: Number(current.version) + 1 })
    return route.fulfill(apiAnswer(roomList[index]))
  })

  // The classes: listed in scope (searched by code or name), created in preparation inside an active
  // offer with a code unique in the unit and period, edited (name, shift and room) with the version, and
  // activated or inactivated as the backend decides it - what stops activating comes from the unit, the
  // offer, the period, the capacity and the room; inactivating always meets the silent enrollment source.
  const classList = classes.map((item) => ({ ...item }))
  let nextClassId = 160

  const impediments = (item: Item) => {
    const out: string[] = []
    const itemOffer = offerList.find((entry) => entry.id === item.offerId)
    if (!itemOffer || itemOffer.status !== "ACTIVE") out.push("the offer is inactive")
    const itemPeriod = periodList.find((entry) => entry.id === item.periodId)
    if (!itemPeriod || itemPeriod.status === "CLOSED") out.push("the period is closed")
    if (Number(item.capacity) <= 0) out.push("the capacity must be above zero")
    const itemRoom = roomList.find((entry) => entry.id === item.roomId)
    if (item.roomId && (!itemRoom || itemRoom.status !== "ACTIVE")) out.push("the room is inactive")
    return out
  }

  const classView = (item: Item): Item => {
    const computed = {
      ...item,
      eligibleActions: classActions[String(item.status)],
      eligibleForEnrollment: item.status === "ACTIVE" && impediments(item).length === 0,
      pendencies: linkList.some((link) => link.classId === item.id && linkState(link) !== "ENDED")
        ? []
        : ["NO_TEACHER"],
      shiftLabel: shiftLabels[String(item.shift)],
    }
    return view(computed)
  }

  await page.route(/\/api\/academic\/classes(\?.*)?$/, (route) => {
    const call = record(route.request())
    if (call.method === "GET") {
      const { gradeId, periodId, q, status, unitId } = call.query
      const found = classList
        .filter((item) => !unitId || String(item.unitId) === unitId)
        .filter((item) => !periodId || String(item.periodId) === periodId)
        .filter((item) => !gradeId || String(item.gradeId) === gradeId)
        .filter((item) => !status || item.status === status)
        .filter((item) => !q || fold(item.name).includes(fold(q)) || fold(item.code).includes(fold(q)))
        .map(classView)
      return route.fulfill(apiAnswer(toPage(found, call.query)))
    }

    const body = call.body as Item
    const itemOffer = offerList.find(
      (entry) =>
        entry.unitId === body.unitId &&
        entry.periodId === body.periodId &&
        entry.gradeId === body.gradeId &&
        entry.status === "ACTIVE",
    )
    if (!itemOffer) return route.fulfill(apiError(422, "ACADEMIC_FIELD_INCOMPATIBLE"))
    const repeated = classList.some(
      (item) => item.unitId === body.unitId && item.periodId === body.periodId && fold(item.code) === fold(body.code),
    )
    if (repeated) return route.fulfill(apiError(409, "ACADEMIC_DUPLICATE_CODE"))
    const created = classBase({
      ...body,
      id: nextClassId++,
      noPhysicalRoom: Boolean(body.noPhysicalRoom),
      offerId: itemOffer.id,
      pendencies: ["NO_TEACHER"],
      roomId: body.roomId ?? null,
      status: "PREPARATION",
    })
    classList.push(created)
    return route.fulfill(apiAnswer(classView(created)))
  })

  await page.route(/\/api\/academic\/classes\/\d+(\/(impact|activate|inactivate|overview|general))?$/, (route) => {
    const call = record(route.request())
    const [, id, , action] =
      /\/api\/academic\/classes\/(\d+)(\/(impact|activate|inactivate|overview|general))?$/.exec(call.path) ?? []
    const index = classList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = classList[index]

    if (action === "impact") {
      return route.fulfill(
        apiAnswer({
          activationImpediments: impediments(current),
          classId: Number(id),
          enrollmentSourceAvailable: false,
          inactivationBlockers: ["the enrollment source is not available, so the absence of students cannot be proved"],
        }),
      )
    }
    if (action === "overview") {
      const tabs = options.readOnly
        ? ["GENERAL", "STUDENTS", "TEACHERS"]
        : ["GENERAL", "STUDENTS", "TEACHERS", "CAPACITY", "HISTORY"]
      return route.fulfill(apiAnswer({ schoolClass: classView(current), tabs }))
    }
    if (action === "general") {
      const itemGrade = catalog.grades.find((entry) => entry.id === current.gradeId)
      return route.fulfill(
        apiAnswer({
          gradeName: itemGrade?.name,
          periodName: periodList.find((entry) => entry.id === current.periodId)?.name,
          roomName: roomList.find((entry) => entry.id === current.roomId)?.name ?? null,
          schoolClass: classView(current),
          stageName: catalog.stages.find((entry) => entry.id === itemGrade?.stageId)?.name,
          subjects: catalog.subjects
            .filter((entry) => (current.subjectIds as number[]).includes(Number(entry.id)))
            .map((entry) => ({ code: entry.code, id: entry.id, name: entry.name })),
          unitName: units.find((unit) => unit.schoolUnitId === current.unitId)?.unitName,
        }),
      )
    }
    if (call.method === "GET") return route.fulfill(apiAnswer(classView(current)))

    if (options.changedClassId === Number(id) && !classChanged) {
      classChanged = true
      classList[index] = {
        ...current,
        name: `${String(current.name)} (revisada)`,
        version: Number(current.version) + 1,
      }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action) {
      classList[index] = {
        ...current,
        name: body.name,
        noPhysicalRoom: Boolean(body.noPhysicalRoom),
        roomId: body.roomId ?? null,
        shift: body.shift,
        version: Number(current.version) + 1,
      }
      return route.fulfill(apiAnswer(classView(classList[index])))
    }

    if (action === "activate") {
      const found = impediments(current)
      if (found.length > 0) return route.fulfill(notEligible(`The class cannot be activated: ${found.join("; ")}.`))
      classList[index] = { ...current, status: "ACTIVE", version: Number(current.version) + 1 }
      return route.fulfill(apiAnswer(classView(classList[index])))
    }

    if (current.status !== "ACTIVE") return route.fulfill(notEligible("Only an active class can be inactivated."))
    return route.fulfill(apiError(503, "ACADEMIC_SOURCE_UNAVAILABLE"))
  })

  // The teacher links: the unit's Professors searched by name (from two letters); a link only to a subject
  // of the class, dates inclusive (the start not before the period's), a past date only with a reason; the
  // same teacher never twice in overlapping dates, another one only as joint teaching on both links; a link
  // not ended is edited (its dates and joint) and ended with a reason, never deleted.
  const linkList = teacherLinks.map((item) => ({ ...item }))
  let nextLinkId = 170

  const linkState = (link: Item) => {
    const today = isoToday()
    if (link.endDate && String(link.endDate) < today) return "ENDED"
    if (String(link.startDate) > today) return "SCHEDULED"
    return "CURRENT"
  }

  const linkView = (link: Item): Item => {
    const state = linkState(link)
    const editable = !options.readOnly && !link.endedByCommand && state !== "ENDED"
    const { endedByCommand, ...rest } = link
    void endedByCommand
    return { ...rest, eligibleActions: editable ? ["EDIT", "END"] : [], state }
  }

  const linkProblem = (
    schoolClass: Item,
    body: Item,
    teacherUserId: unknown,
    subjectId: unknown,
    exceptId?: number,
  ) => {
    const itemPeriod = periodList.find((entry) => entry.id === schoolClass.periodId)
    if (body.endDate && String(body.endDate) < String(body.startDate)) return apiError(422, "ACADEMIC_INVALID_RANGE")
    if (itemPeriod && String(body.startDate) < String(itemPeriod.startDate)) {
      return apiError(422, "ACADEMIC_INVALID_RANGE")
    }
    const today = isoToday()
    const backdated = String(body.startDate) < today || (body.endDate && String(body.endDate) < today)
    if (backdated && !body.reason) return apiError(400, "VALIDATION_ERROR")
    const ends = (link: Item) => String(link.endDate ?? "9999-12-31")
    const overlapping = linkList.filter(
      (link) =>
        link.id !== exceptId &&
        link.classId === schoolClass.id &&
        link.subjectId === subjectId &&
        String(link.startDate) <= String(body.endDate ?? "9999-12-31") &&
        String(body.startDate) <= ends(link),
    )
    if (overlapping.some((link) => link.teacherUserId === teacherUserId)) {
      return apiError(409, "ACADEMIC_DUPLICATE_CODE")
    }
    if (overlapping.some((link) => !(body.joint && link.joint))) return apiError(409, "ACADEMIC_JOINT_REQUIRED")
    return null
  }

  await page.route(/\/api\/academic\/teachers\/search\?.*$/, (route) => {
    const call = record(route.request())
    const found = teachers.filter(
      (teacher) => String(teacher.unitId) === call.query.unitId && fold(teacher.fullName).includes(fold(call.query.q)),
    )
    return route.fulfill(apiAnswer(found))
  })

  await page.route(/\/api\/academic\/classes\/\d+\/teachers$/, (route) => {
    const call = record(route.request())
    const classId = Number(/\/classes\/(\d+)\/teachers$/.exec(call.path)?.[1])
    const schoolClass = classList.find((item) => item.id === classId)
    if (!schoolClass) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    if (call.method === "GET") {
      return route.fulfill(apiAnswer(linkList.filter((link) => link.classId === classId).map(linkView)))
    }

    const body = call.body as Item
    if (!(schoolClass.subjectIds as number[]).includes(Number(body.subjectId))) {
      return route.fulfill(apiError(422, "ACADEMIC_FIELD_INCOMPATIBLE"))
    }
    const problem = linkProblem(schoolClass, body, body.teacherUserId, body.subjectId)
    if (problem) return route.fulfill(problem)
    const teacher = teachers.find((item) => item.userId === body.teacherUserId)
    const created: Item = {
      classId,
      endDate: body.endDate ?? null,
      endReason: null,
      endedByCommand: false,
      id: nextLinkId++,
      joint: Boolean(body.joint),
      startDate: body.startDate,
      subjectId: body.subjectId,
      teacherName: teacher?.fullName,
      teacherUserId: body.teacherUserId,
      version: 0,
    }
    linkList.push(created)
    return route.fulfill(apiAnswer(linkView(created)))
  })

  await page.route(/\/api\/academic\/teacher-links\/\d+(\/end)?$/, (route) => {
    const call = record(route.request())
    const [, id, isEnd] = /\/teacher-links\/(\d+)(\/end)?$/.exec(call.path) ?? []
    const index = linkList.findIndex((link) => link.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = linkList[index]
    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    if (current.endedByCommand) return route.fulfill(apiError(422, "ACADEMIC_NOT_ELIGIBLE"))
    const schoolClass = classList.find((item) => item.id === current.classId) ?? {}

    if (isEnd) {
      if (String(body.endDate) < String(current.startDate))
        return route.fulfill(apiError(422, "ACADEMIC_INVALID_RANGE"))
      linkList[index] = {
        ...current,
        endDate: body.endDate,
        endReason: body.reason,
        endedByCommand: true,
        version: Number(current.version) + 1,
      }
      return route.fulfill(apiAnswer(linkView(linkList[index])))
    }

    const problem = linkProblem(schoolClass, body, current.teacherUserId, current.subjectId, Number(id))
    if (problem) return route.fulfill(problem)
    linkList[index] = {
      ...current,
      endDate: body.endDate ?? null,
      joint: Boolean(body.joint),
      startDate: body.startDate,
      version: Number(current.version) + 1,
    }
    return route.fulfill(apiAnswer(linkView(linkList[index])))
  })

  // The class detail's other tabs and the overview: the occupation and the students come from the
  // enrollment (UNAVAILABLE unless the spec turns it on), the capacity is reviewed with a reason (lowering
  // it needs the enrollment), the history is filtered by type and dates, and the overview counts the
  // classes of the asked unit and period.
  const eventList = classEvents.map((item) => ({ ...item }))
  let nextEventId = 950

  const occupancyOf = (classId: unknown) =>
    options.enrollmentAvailable && classId === 61
      ? classStudents.filter((student) => student.status === "ACTIVE").length
      : 0

  const capacityView = (item: Item): Item => {
    const available = Boolean(options.enrollmentAvailable)
    const occupation = occupancyOf(item.id)
    const actions = options.readOnly || item.status === "INACTIVE" ? [] : ["REVIEW_CAPACITY"]
    return {
      capacity: item.capacity,
      classId: item.id,
      eligibleActions: actions,
      exceptionEnabled: false,
      excess: available ? Math.max(occupation - Number(item.capacity), 0) : null,
      occupation: available
        ? { asOf: "2026-11-20T15:00:00Z", status: "AVAILABLE", value: occupation }
        : { asOf: null, status: "UNAVAILABLE", value: null },
      queriedAt: "2026-11-20T15:00:00Z",
      seats: available ? Math.max(Number(item.capacity) - occupation, 0) : null,
      version: item.version,
    }
  }

  await page.route(/\/api\/academic\/overview(\?.*)?$/, (route) => {
    const call = record(route.request())
    const { periodId, unitId } = call.query
    const found = classList
      .filter((item) => !unitId || String(item.unitId) === unitId)
      .filter((item) => !periodId || String(item.periodId) === periodId)
    const count = (status: string) => found.filter((item) => item.status === status).length
    const active = found.filter((item) => item.status === "ACTIVE")
    const available = Boolean(options.enrollmentAvailable) || active.length === 0
    const capacity = active.reduce((sum, item) => sum + Number(item.capacity), 0)
    const occupation = active.reduce((sum, item) => sum + occupancyOf(item.id), 0)
    const shortcuts = options.readOnly
      ? []
      : ["CREATE_PERIOD", "CREATE_CLASS", "LINK_TEACHER", ...(active.length > 0 ? ["REVIEW_CAPACITY"] : [])]
    return route.fulfill(
      apiAnswer({
        active: active.length,
        capacity,
        classes: options.emptyStructure ? 0 : found.length,
        classesWithoutTeacher: active.filter(
          (item) => !linkList.some((link) => link.classId === item.id && linkState(link) !== "ENDED"),
        ).length,
        contextKey: `u${unitId ?? 0}:p${periodId ?? 0}`,
        inPreparation: count("PREPARATION"),
        inactive: count("INACTIVE"),
        occupation: available
          ? { asOf: null, status: "AVAILABLE", value: occupation }
          : { asOf: null, status: "UNAVAILABLE", value: null },
        periodId: periodId ? Number(periodId) : null,
        seats: available ? Math.max(capacity - occupation, 0) : null,
        shortcuts,
        state: options.emptyStructure ? "EMPTY" : "READY",
        unitId: unitId ? Number(unitId) : null,
      }),
    )
  })

  await page.route(/\/api\/academic\/classes\/\d+\/(students|capacity|capacity-review|history)(\?.*)?$/, (route) => {
    const call = record(route.request())
    const [, id, part] = /\/classes\/(\d+)\/(students|capacity|capacity-review|history)$/.exec(call.path) ?? []
    const index = classList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = classList[index]

    if (part === "students") {
      if (!options.enrollmentAvailable) {
        return route.fulfill(
          apiAnswer({ asOf: null, items: [], page: 0, size: 20, status: "UNAVAILABLE", total: null }),
        )
      }
      const q = fold(call.query.q)
      const items = current.id === 61 ? classStudents.filter((student) => fold(student.name).includes(q)) : []
      return route.fulfill(
        apiAnswer({ asOf: "2026-11-20T15:00:00Z", items, page: 0, size: 20, status: "AVAILABLE", total: items.length }),
      )
    }

    if (part === "capacity") {
      if (options.readOnly) return route.fulfill(apiError(403, "ACCESS_DENIED"))
      return route.fulfill(apiAnswer(capacityView(current)))
    }

    if (part === "capacity-review") {
      const body = call.body as Item
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const newCapacity = Number(body.newCapacity)
      if (newCapacity < Number(current.capacity)) {
        if (!options.enrollmentAvailable) return route.fulfill(apiError(503, "ACADEMIC_SOURCE_UNAVAILABLE"))
        if (occupancyOf(current.id) > newCapacity) {
          return route.fulfill(apiError(409, "ACADEMIC_CAPACITY_BELOW_OCCUPATION"))
        }
      }
      eventList.unshift({
        action: "CAPACITY_REVIEWED",
        actorName: "João Silva",
        actorUserId: 1,
        after: String(newCapacity),
        before: String(current.capacity),
        category: "CAPACITY",
        changedFields: ["capacity"],
        classId: current.id,
        id: nextEventId++,
        objectId: current.id,
        objectType: "CLASS",
        occurredAt: new Date().toISOString(),
        reason: body.reason,
      })
      classList[index] = { ...current, capacity: newCapacity, version: Number(current.version) + 1 }
      return route.fulfill(apiAnswer(capacityView(classList[index])))
    }

    if (options.readOnly) return route.fulfill(apiError(403, "ACCESS_DENIED"))
    const { from, to, type } = call.query
    if (from && to && to < from) return route.fulfill(apiError(422, "ACADEMIC_INVALID_RANGE"))
    const found = eventList
      .filter((event) => event.classId === current.id)
      .filter((event) => !type || event.category === type)
      .filter((event) => !from || String(event.occurredAt).slice(0, 10) >= from)
      .filter((event) => !to || String(event.occurredAt).slice(0, 10) <= to)
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  // The calendar: items prepared per period and units (saving never publishes), the preview of a unit with
  // its revision, a publication of that revision as a closed snapshot (the previous version superseded), a
  // withdrawal with a reason (the version kept) and the published calendar of a context.
  const itemList = calendarItems.map((item) => ({ ...item }))
  const versionList = calendarVersions.map((item) => ({ ...item }))
  let nextItemId = 180
  let nextVersionId = 190
  let calendarChanged = false

  const itemView = (item: Item): Item => ({ ...item, eligibleActions: options.readOnly ? [] : ["EDIT", "REMOVE"] })
  const activeItems = (periodId: number, unitId: number) =>
    itemList
      .filter(
        (item) => item.status === "ACTIVE" && item.periodId === periodId && (item.unitIds as number[]).includes(unitId),
      )
      .sort((first, second) => String(first.startDate).localeCompare(String(second.startDate)))
  const canPublish = !options.readOnly && !options.calendarCannotPublish
  const versionView = (version: Item): Item => ({
    ...version,
    eligibleActions: canPublish && version.status === "PUBLISHED" ? ["WITHDRAW"] : [],
  })

  await page.route(/\/api\/academic\/calendar\/items(\?.*)?$/, (route) => {
    const call = record(route.request())
    if (call.method === "GET") {
      const periodId = Number(call.query.periodId)
      const unitId = Number(call.query.unitId)
      return route.fulfill(apiAnswer(toPage(activeItems(periodId, unitId).map(itemView), { size: "200" })))
    }
    const body = call.body as Item
    const itemPeriod = periodList.find((entry) => entry.id === body.periodId)
    if (
      itemPeriod &&
      (String(body.startDate) < String(itemPeriod.startDate) || String(body.endDate) > String(itemPeriod.endDate))
    ) {
      return route.fulfill(apiError(422, "ACADEMIC_INVALID_RANGE"))
    }
    const created = { ...body, description: body.description ?? null, id: nextItemId++, status: "ACTIVE", version: 0 }
    itemList.push(created)
    return route.fulfill(apiAnswer(itemView(created)))
  })

  await page.route(/\/api\/academic\/calendar\/items\/\d+(\/inactivate)?$/, (route) => {
    const call = record(route.request())
    const [, id, inactivate] = /\/calendar\/items\/(\d+)(\/inactivate)?$/.exec(call.path) ?? []
    const index = itemList.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const current = itemList[index]
    if (call.method === "GET") return route.fulfill(apiAnswer(itemView(current)))
    const body = call.body as Item
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    itemList[index] = inactivate
      ? { ...current, status: "INACTIVE", version: Number(current.version) + 1 }
      : { ...current, ...body, description: body.description ?? null, version: Number(current.version) + 1 }
    return route.fulfill(apiAnswer(itemView(itemList[index])))
  })

  await page.route(/\/api\/academic\/calendar\/preview\?.*$/, (route) => {
    const call = record(route.request())
    const periodId = Number(call.query.periodId)
    const unitId = Number(call.query.unitId)
    const active = activeItems(periodId, unitId)
    const published = versionList.find(
      (version) => version.periodId === periodId && version.unitId === unitId && version.status === "PUBLISHED",
    )
    const revision = revisionOf(active)
    return route.fulfill(
      apiAnswer({
        canPublish: canPublish && active.length > 0,
        changedSincePublished: published ? published.revision !== revision : active.length > 0,
        items: active.map(itemView),
        periodId,
        publishedVersionNo: published ? published.versionNo : null,
        revision,
        schoolDays: schoolDaysOf(active),
        unitId,
      }),
    )
  })

  await page.route(/\/api\/academic\/calendar\/publish$/, (route) => {
    const call = record(route.request())
    if (!canPublish) return route.fulfill(apiError(403, "SCOPE_DENIED"))
    const body = call.body as { periodId: number; units: { revision: string; unitId: number }[] }
    if (options.calendarChangedBeforePublish && !calendarChanged) {
      calendarChanged = true
      const index = itemList.findIndex((item) => item.id === 83)
      itemList[index] = {
        ...itemList[index],
        title: "Reunião de pais e mestres",
        version: Number(itemList[index].version) + 1,
      }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }
    for (const unit of body.units) {
      const active = activeItems(body.periodId, unit.unitId)
      if (revisionOf(active) !== unit.revision) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }
    const created = body.units.map((unit) => {
      const active = activeItems(body.periodId, unit.unitId)
      const previous = versionList.filter(
        (version) => version.periodId === body.periodId && version.unitId === unit.unitId,
      )
      previous.forEach((version) => {
        if (version.status === "PUBLISHED") version.status = "SUPERSEDED"
      })
      const version: Item = {
        id: nextVersionId++,
        items: snapshotOf(active),
        periodId: body.periodId,
        publishedAt: new Date().toISOString(),
        revision: unit.revision,
        schoolDays: schoolDaysOf(active),
        status: "PUBLISHED",
        unitId: unit.unitId,
        version: 0,
        versionNo: previous.length + 1,
        withdrawReason: null,
      }
      versionList.push(version)
      return versionView(version)
    })
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/academic\/calendar\/versions\?.*$/, (route) => {
    const call = record(route.request())
    const found = versionList
      .filter(
        (version) => String(version.periodId) === call.query.periodId && String(version.unitId) === call.query.unitId,
      )
      .sort((first, second) => Number(second.versionNo) - Number(first.versionNo))
      .map(versionView)
    return route.fulfill(apiAnswer(found))
  })

  await page.route(/\/api\/academic\/calendar\/versions\/\d+\/withdraw$/, (route) => {
    const call = record(route.request())
    const id = Number(/\/versions\/(\d+)\/withdraw$/.exec(call.path)?.[1])
    const version = versionList.find((item) => item.id === id)
    if (!version) return route.fulfill(apiError(404, "ACADEMIC_NOT_FOUND"))
    const body = call.body as Item
    if (body.version !== version.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    version.status = "WITHDRAWN"
    version.withdrawReason = body.reason
    version.version = Number(version.version) + 1
    return route.fulfill(apiAnswer(versionView(version)))
  })

  await page.route(/\/api\/academic\/calendar\/published(\?.*)?$/, (route) => {
    const call = record(route.request())
    const { periodId, unitId } = call.query
    const found = versionList
      .filter((version) => version.status === "PUBLISHED")
      .filter((version) => !unitId || String(version.unitId) === unitId)
      .filter((version) => !periodId || String(version.periodId) === periodId)
      .map(versionView)
    return route.fulfill(apiAnswer({ state: found.length > 0 ? "PUBLISHED" : "NOT_PUBLISHED", versions: found }))
  })

  return { calls }
}
