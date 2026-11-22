import type { Request } from "@playwright/test"

import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall, units } from "./userAccess.ts"

// A mocked backend for the people screens (P03): the units an Admin lists, the students and the
// guardians, each list filtered and paged like the backend does it, plus every call recorded for the
// specs to check what was sent.

type Item = Record<string, unknown>

const unitRef = (id: number) => {
  const unit = units.find((item) => item.schoolUnitId === id)
  return unit ? { id, name: unit.unitName } : null
}

export const students = [
  {
    activeGuardians: 2,
    fullName: "Ana Beatriz Souza",
    hasFinancialGuardian: true,
    id: 201,
    maskedDocument: "***.456.789-**",
    referenceUnit: unitRef(1),
    status: "ACTIVE",
    studentCode: "ALU-000001",
  },
  {
    activeGuardians: 1,
    fullName: "Bruno Lima",
    hasFinancialGuardian: false,
    id: 202,
    maskedDocument: null,
    referenceUnit: unitRef(2),
    status: "ACTIVE",
    studentCode: "ALU-000002",
  },
  {
    activeGuardians: 0,
    fullName: "Carla Dias",
    hasFinancialGuardian: false,
    id: 203,
    maskedDocument: null,
    referenceUnit: unitRef(1),
    status: "DRAFT",
    studentCode: "ALU-000003",
  },
  {
    activeGuardians: 1,
    fullName: "Davi Rocha",
    hasFinancialGuardian: true,
    id: 204,
    maskedDocument: null,
    referenceUnit: unitRef(2),
    status: "INACTIVE",
    studentCode: "ALU-000004",
  },
]

export const guardians = [
  {
    activeStudents: 1,
    fullName: "Fernanda Souza",
    hasFinancialLink: true,
    id: 301,
    maskedDocument: "***.111.222-**",
    maskedEmail: "f*****@gmail.com",
    phone: "+55 85 98888 2200",
    status: "ACTIVE",
    // Not in the list's answer: which units the guardian belongs to, for the unit filter.
    unitIds: [1],
  },
  {
    activeStudents: 2,
    fullName: "Gustavo Lima",
    hasFinancialLink: false,
    id: 302,
    maskedDocument: null,
    maskedEmail: null,
    phone: null,
    status: "ACTIVE",
    unitIds: [1, 2],
  },
  {
    activeStudents: 0,
    fullName: "Helena Rocha",
    hasFinancialLink: false,
    id: 303,
    maskedDocument: null,
    maskedEmail: "h*****@outlook.com",
    phone: null,
    status: "INACTIVE",
    unitIds: [2],
  },
]

type ListFailure = { code?: string; status: number }

type PeopleOptions = {
  guardians?: Item[]
  // Answers every read of this list with an error (403, 429 SEARCH_RATE_LIMITED, 500...).
  listFailure?: { guardians?: ListFailure; students?: ListFailure }
  students?: Item[]
}

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

const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

// The list filters, as the backend applies them: the search by name (without accents) or exact code,
// the status, and the unit (the reference unit of a student, any unit of a guardian).
const matches = (item: Item, query: Record<string, string>) => {
  const q = query.q ? fold(query.q) : ""
  if (q && !fold(item.fullName).includes(q) && fold(item.studentCode) !== q) return false
  if (query.status && item.status !== query.status) return false
  if (query.unitId) {
    const unitIds = item.unitIds as number[] | undefined
    const referenceUnit = item.referenceUnit as { id: number } | null | undefined
    if (unitIds && !unitIds.includes(Number(query.unitId))) return false
    if (!unitIds && String(referenceUnit?.id) !== query.unitId) return false
  }

  return true
}

const withoutUnitIds = (item: Item) => {
  const copy = { ...item }
  delete copy.unitIds
  return copy
}

export const mockPeopleApi = async (page: Page, options: PeopleOptions = {}) => {
  const calls: RecordedCall[] = []
  const studentList = [...(options.students ?? students)]
  const guardianList = [...(options.guardians ?? guardians)]

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
    return route.fulfill(
      apiAnswer({ content: units, number: 0, size: 100, totalElements: units.length, totalPages: 1 }),
    )
  })

  await page.route("**/api/students?*", (route) => {
    const call = record(route.request())
    const failure = options.listFailure?.students
    if (failure) return route.fulfill(apiError(failure.status, failure.code))

    return route.fulfill(
      apiAnswer(
        toPage(
          studentList.filter((item) => matches(item, call.query)),
          call.query,
        ),
      ),
    )
  })

  await page.route("**/api/guardians?*", (route) => {
    const call = record(route.request())
    const failure = options.listFailure?.guardians
    if (failure) return route.fulfill(apiError(failure.status, failure.code))

    const found = guardianList.filter((item) => matches(item, call.query)).map(withoutUnitIds)
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  return { calls }
}
