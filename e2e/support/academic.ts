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
  // Someone else changes this period before the first save of the spec (409 VERSION_CONFLICT).
  changedPeriodId?: number
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

  return { calls }
}
