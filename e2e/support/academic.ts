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

type AcademicOptions = {
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

  return { calls }
}
