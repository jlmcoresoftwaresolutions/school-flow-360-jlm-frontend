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

// The people the global search finds: a student, a guardian who is also a student, and a guardian.
export const searchablePeople = [
  {
    fullName: "Ana Beatriz Souza",
    guardianStatus: null,
    id: 201,
    maskedDocument: "***.456.789-**",
    nickname: "ana.souza482",
    studentCode: "ALU-000001",
    studentStatus: "ACTIVE",
    types: ["STUDENT"],
    units: [unitRef(1)],
  },
  {
    fullName: "Fernanda Souza",
    guardianStatus: "ACTIVE",
    id: 301,
    maskedDocument: "***.111.222-**",
    nickname: "fernanda.souza120",
    studentCode: "ALU-000009",
    studentStatus: "DRAFT",
    types: ["STUDENT", "GUARDIAN"],
    units: [unitRef(1), unitRef(2)],
  },
  {
    fullName: "Gustavo Lima",
    guardianStatus: "INACTIVE",
    id: 302,
    maskedDocument: null,
    nickname: "gustavo.lima310",
    studentCode: null,
    studentStatus: null,
    types: ["GUARDIAN"],
    units: [unitRef(2)],
  },
]

type ListFailure = { code?: string; status: number }

type PeopleOptions = {
  // Answers a student save with this contact e-mail, without a review, with 409 DUPLICATE_REVIEW_REQUIRED
  // (someone else already has it).
  duplicateEmail?: string
  guardians?: Item[]
  // Answers every read of this list with an error (403, 429 SEARCH_RATE_LIMITED, 500...).
  listFailure?: { guardians?: ListFailure; search?: ListFailure; students?: ListFailure }
  students?: Item[]
}

export const documentTypes = [
  { code: "CPF", hasExpiry: false, label: "CPF" },
  { code: "RG", hasExpiry: false, label: "RG" },
  { code: "PASSPORT", hasExpiry: true, label: "Passaporte" },
]

// What the duplicate review finds for `duplicateEmail`: a student in reach and a guardian out of it.
export const duplicateCandidates = [
  {
    fullName: "Ana Beatriz Souza",
    id: 201,
    inScope: true,
    maskedDocument: "***.456.789-**",
    maskedEmail: "a***@gmail.com",
    partialName: "Ana B.",
    ref: "ref-201",
    signals: ["EMAIL"],
    strong: true,
    types: ["STUDENT"],
  },
  {
    fullName: null,
    id: null,
    inScope: false,
    maskedDocument: null,
    maskedEmail: "a***@gmail.com",
    partialName: "Antônio R.",
    ref: "ref-900",
    signals: ["EMAIL"],
    strong: true,
    types: ["GUARDIAN"],
  },
]

// A student as GET /api/students/{id} returns it, from a list row: a draft without a guardian can't be
// activated yet.
const toStudent = (summary: Item): Item => ({
  activatedByException: false,
  activationBlockers: summary.status !== "ACTIVE" && summary.activeGuardians === 0 ? ["NO_GUARDIAN"] : [],
  activeGuardians: summary.activeGuardians,
  address: null,
  birthDate: "2016-03-15",
  contactEmail: null,
  createdAt: "2026-11-20T12:00:00Z",
  documentType: summary.maskedDocument ? "CPF" : null,
  fullName: summary.fullName,
  hasAccess: false,
  id: summary.id,
  loginEmail: null,
  maskedDocument: summary.maskedDocument,
  nickname: `${String(summary.fullName).toLowerCase().split(" ")[0]}.${summary.id}`,
  observation: null,
  phone: null,
  referenceUnit: summary.referenceUnit,
  socialName: null,
  status: summary.status,
  studentCode: summary.studentCode,
  updatedAt: "2026-11-20T12:00:00Z",
  version: 0,
})

const guardianNames = ["Fernanda Souza", "Gustavo Lima"]

// The 360 profile of a student: one active link for each guardian counted.
const toProfile = (student: Item): Item => ({
  guardianInvitations: [],
  guardians: Array.from({ length: Number(student.activeGuardians) }, (_, index) => ({
    guardian: {
      activeStudents: 1,
      fullName: guardianNames[index],
      hasFinancialLink: index === 0,
      id: 301 + index,
      maskedDocument: null,
      maskedEmail: "f*****@gmail.com",
      phone: null,
      status: "ACTIVE",
    },
    link: {
      consentAt: "2026-11-20T12:00:00Z",
      consentTermsVersion: "v1",
      contactAuthorized: true,
      endDate: null,
      endReason: null,
      financialResponsible: index === 0,
      guardian: { code: null, id: 301 + index, name: guardianNames[index] },
      id: 700 + index,
      pedagogicalResponsible: true,
      relationshipCode: index === 0 ? "MOTHER" : "FATHER",
      relationshipLabel: index === 0 ? "Mãe" : "Pai",
      startDate: "2026-02-01",
      status: "ACTIVE",
      student: { code: student.studentCode, id: student.id, name: student.fullName },
      version: 0,
    },
  })),
  sections: ["IDENTITY", "GUARDIANS", "INVITATIONS", "DOCUMENTS", "HISTORY"],
  student,
})

const nextStatus: Record<string, string> = {
  activate: "ACTIVE",
  discard: "INACTIVE",
  inactivate: "INACTIVE",
  reactivate: "ACTIVE",
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

  // The global search: by name (without accents), or an exact nickname or student code; the type, status
  // and unit filters as the backend applies them, with what matched.
  await page.route("**/api/people/search?*", (route) => {
    const call = record(route.request())
    const failure = options.listFailure?.search
    if (failure) return route.fulfill(apiError(failure.status, failure.code))

    const { q = "", status, type, unitId } = call.query
    const found = searchablePeople
      .map((person) => {
        const matchedBy = []
        if (fold(person.fullName).includes(fold(q))) matchedBy.push("NAME")
        if (fold(person.nickname) === fold(q)) matchedBy.push("NICKNAME")
        if (fold(person.studentCode) === fold(q)) matchedBy.push("STUDENT_CODE")
        return { ...person, matchedBy }
      })
      .filter((person) => person.matchedBy.length > 0)
      .filter((person) => !type || type === "ANY" || person.types.includes(type))
      .filter((person) => !status || person.studentStatus === status || person.guardianStatus === status)
      .filter((person) => !unitId || person.units.some((unit) => String(unit?.id) === unitId))
    return route.fulfill(apiAnswer(toPage(found, call.query)))
  })

  // The students' records, kept like the backend keeps them (every change bumps the version).
  const records = new Map<number, Item>(studentList.map((item) => [item.id as number, toStudent(item)]))
  let nextStudentId = 250

  await page.route("**/api/catalogs/document-types", (route) => route.fulfill(apiAnswer(documentTypes)))

  await page.route(/\/api\/students\/\d+(\/[a-z-]+)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/students\/(\d+)(?:\/([a-z-]+))?$/.exec(call.path) ?? []
    const student = records.get(Number(id))
    if (!student) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(student))
    if (action === "profile") return route.fulfill(apiAnswer(toProfile(student)))

    const body = call.body as Item
    if (body.version !== student.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action && call.method === "PUT") {
      const updated = { ...student, ...body, version: Number(student.version) + 1 }
      records.set(Number(id), updated)
      return route.fulfill(apiAnswer(updated))
    }

    const blockers = student.activationBlockers as string[]
    const activating = action === "activate" || action === "reactivate"
    if (activating && blockers.includes("NO_GUARDIAN") && !body.exceptionReason) {
      return route.fulfill(apiError(422, "GUARDIAN_REQUIRED"))
    }
    const changed = {
      ...student,
      activatedByException: Boolean(body.exceptionReason),
      activationBlockers: activating ? [] : blockers,
      status: nextStatus[action],
      version: Number(student.version) + 1,
    }
    records.set(Number(id), changed)
    return route.fulfill(apiAnswer(changed))
  })

  await page.route("**/api/students", (route) => {
    const call = record(route.request())
    const body = call.body as Item
    if (options.duplicateEmail && body.contactEmail === options.duplicateEmail && !body.duplicateReviewId) {
      return route.fulfill(apiError(409, "DUPLICATE_REVIEW_REQUIRED"))
    }
    if (body.nickname === "ana.souza482") return route.fulfill(apiError(409, "NICKNAME_IN_USE"))

    const id = nextStudentId++
    const unit = units.find((item) => item.schoolUnitId === body.referenceUnitId)
    const created = {
      ...toStudent({
        activeGuardians: 0,
        fullName: body.fullName,
        id,
        maskedDocument: body.documentNumber ? "***.***.***-**" : null,
        referenceUnit: unit ? { id: unit.schoolUnitId, name: unit.unitName } : null,
        status: "DRAFT",
        studentCode: `ALU-000${id}`,
      }),
      birthDate: body.birthDate ?? null,
      contactEmail: body.contactEmail ?? null,
      nickname: body.nickname ?? "novo.aluno123",
    }
    records.set(id, created)
    return route.fulfill(apiAnswer(created))
  })

  await page.route("**/api/people/duplicate-reviews", (route) => {
    record(route.request())
    return route.fulfill(
      apiAnswer({
        candidates: duplicateCandidates,
        decidedAt: null,
        decision: null,
        justification: null,
        kind: "STUDENT",
        reuseRef: null,
        reviewId: 41,
        signals: ["EMAIL"],
        status: "PENDING",
        strength: "STRONG",
      }),
    )
  })

  await page.route(/\/api\/people\/duplicate-reviews\/\d+\/decision$/, (route) => {
    const call = record(route.request())
    const body = call.body as Item
    if (body.decision === "KEEP_SEPARATE" && String(body.justification ?? "").length < 10) {
      return route.fulfill(apiError(422, "JUSTIFICATION_REQUIRED"))
    }
    return route.fulfill(apiAnswer({ decision: body.decision, reuseRef: null, reviewId: 41, status: "DECIDED" }))
  })

  await page.route(/\/api\/users\/\d+\/temporary-password$/, (route) => {
    record(route.request())
    return route.fulfill(apiAnswer({ expiresAt: "2026-11-30T15:00:00Z", temporaryPassword: "Kx7mPq2Rt9Wz4N" }))
  })

  return { calls }
}
