import type { Request } from "@playwright/test"

import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall, units } from "./userAccess.ts"

// A mocked backend for the people screens (P03): the units an Admin lists, the students and the
// guardians, each list filtered and paged like the backend does it, the links between them and the
// guardian invitations (kept like the backend keeps them), plus every call recorded for the specs to
// check what was sent.

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
  // Someone else changes this link before the first save of the spec: that save gets 409 VERSION_CONFLICT.
  changedLinkId?: number
  // The documents of the people, by person id (initialDocuments by default).
  documents?: Record<number, Item[]>
  // Answers a student save with this contact e-mail, without a review, with 409 DUPLICATE_REVIEW_REQUIRED
  // (someone else already has it).
  duplicateEmail?: string
  guardians?: Item[]
  // The guardian invitations of the students (none by default).
  invitations?: Item[]
  // Answers every file upload with 503 STORAGE_DISABLED (no bucket configured).
  storageDisabled?: boolean
  // Answers every read of this list with an error (403, 429 SEARCH_RATE_LIMITED, 500...).
  listFailure?: { guardians?: ListFailure; search?: ListFailure; students?: ListFailure }
  students?: Item[]
}

export const documentTypes = [
  { code: "CPF", hasExpiry: false, label: "CPF" },
  { code: "RG", hasExpiry: false, label: "RG" },
  { code: "PASSPORT", hasExpiry: true, label: "Passaporte" },
]

export const relationshipTypes = [
  { code: "MOTHER", hasExpiry: false, label: "Mãe" },
  { code: "FATHER", hasExpiry: false, label: "Pai" },
  { code: "GRANDMOTHER", hasExpiry: false, label: "Avó" },
  { code: "OTHER", hasExpiry: false, label: "Outro" },
]

// A guardian of another unit, out of the operator's reach: the exact check by this e-mail finds it, with
// only a partial name and the proof of reuse.
export const otherUnitGuardian = { email: "antonio@escola.com", id: 390, name: "Antônio Ribeiro", ref: "ref-390" }

// Gustavo Lima accepted an invitation sent from the draft student Carla Dias: the school confirms it.
export const awaitingInvitation = {
  channelResult: "SENT",
  contactAuthorized: true,
  email: "gustavo@gmail.com",
  expiresAt: "2026-11-25T12:00:00Z",
  financialResponsible: true,
  guardianId: 302,
  guardianName: "Gustavo Lima",
  id: 61,
  invitationId: 15,
  invitationStatus: "ACCEPTED",
  linkId: null,
  pedagogicalResponsible: true,
  relationshipCode: "FATHER",
  status: "AWAITING_CONFIRMATION",
  studentId: 203,
}

// A student saved with this name fails unexpectedly: a 500 without a code, with the call's correlation id.
export const unexpectedFailureName = "Erro Inesperado"

const unexpectedFailure = {
  body: JSON.stringify({
    code: null,
    correlationId: "c0ffee42",
    data: null,
    message: "Unexpected error",
    status: "Error",
    tenantId: "schoolflow_demo",
  }),
  contentType: "application/json",
  status: 500,
}

// Where the mocked download links point.
export const filesHost = "https://files.schoolflow.test"

// The documents of the people, by person id: Ana Beatriz Souza has a valid CPF with its file and an
// expired passport; everyone else has none.
export const initialDocuments: Record<number, Item[]> = {
  201: [
    {
      contentType: "image/jpeg",
      documentType: "PASSPORT",
      documentTypeLabel: "Passaporte",
      expiresOn: "2024-01-10",
      fileName: "passaporte-ana.jpg",
      fileSize: 512_000,
      hasFile: true,
      id: 502,
      issuedOn: "2019-01-10",
      maskedNumber: "***4567",
      status: "EXPIRED",
      version: 1,
    },
    {
      contentType: "application/pdf",
      documentType: "CPF",
      documentTypeLabel: "CPF",
      expiresOn: null,
      fileName: "cpf-ana.pdf",
      fileSize: 245_760,
      hasFile: true,
      id: 501,
      issuedOn: "2020-05-10",
      maskedNumber: "***.456.789-**",
      status: "VALID",
      version: 1,
    },
  ],
}

const historyEvent = (id: number, action: string, entityType: string, entityId: number, details: string | null) => ({
  action,
  actorName: id % 2 === 0 ? "João Silva" : "Administracao",
  details,
  entityId: String(entityId),
  entityType,
  id,
  occurredAt: `2026-11-${String(22 - (id % 20)).padStart(2, "0")}T13:30:00Z`,
  result: "SUCCESS",
})

// A student's history: the registration, a change of the data, a link changed (only the financial
// responsibility) and an event this screen doesn't know; Ana Beatriz Souza (201) has 23 events, for
// a second page.
const studentHistory = (id: number) => {
  const events = [
    historyEvent(1, "STUDENT_UPDATED", "STUDENT", id, "fields=fullName,phone"),
    historyEvent(
      2,
      "STUDENT_GUARDIAN_LINK_UPDATED",
      "STUDENT_GUARDIAN_LINK",
      id * 10,
      "before:rel=MOTHER;ped=true;fin=true;con=true;start=2026-02-01|after:rel=MOTHER;ped=true;fin=false;con=true;start=2026-02-01",
    ),
    historyEvent(3, "SOMETHING_NEW", "STUDENT", id, null),
    historyEvent(4, "STUDENT_CREATED", "STUDENT", id, "fields=fullName,birthDate"),
  ]
  if (id !== 201) return events
  const filler = Array.from({ length: 19 }, (_, index) =>
    historyEvent(10 + index, "STUDENT_UPDATED", "STUDENT", id, "fields=observation"),
  )
  return [...events, ...filler]
}

const guardianHistory = (id: number) => [
  historyEvent(1, "GUARDIAN_UPDATED", "GUARDIAN", id, "fields=socialName"),
  historyEvent(2, "GUARDIAN_CREATED", "GUARDIAN", id, "fields=fullName"),
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

const relationshipLabel = (code: unknown) => relationshipTypes.find((type) => type.code === code)?.label ?? code

// The links a list row counts: one active link for each guardian (Fernanda the mother, Gustavo the father),
// each id made of the student's id and its position (2010, 2011...).
const initialLinks = (student: Item): Item[] =>
  Array.from({ length: Number(student.activeGuardians) }, (_, index) => ({
    consentAt: "2026-11-20T12:00:00Z",
    consentTermsVersion: "v1",
    contactAuthorized: true,
    endDate: null,
    endReason: null,
    financialResponsible: index === 0,
    guardian: { code: null, id: 301 + index, name: guardianNames[index] },
    id: Number(student.id) * 10 + index,
    pedagogicalResponsible: true,
    relationshipCode: index === 0 ? "MOTHER" : "FATHER",
    relationshipLabel: index === 0 ? "Mãe" : "Pai",
    startDate: "2026-02-01",
    status: "ACTIVE",
    student: { code: student.studentCode, id: student.id, name: student.fullName },
    version: 0,
  }))

const today = () => new Date().toISOString().slice(0, 10)

// A guardian as GET /api/guardians/{id} returns it, from a list row (its units from `unitIds`).
const toGuardian = (summary: Item): Item => ({
  activeStudents: summary.activeStudents,
  address: null,
  birthDate: null,
  contactEmail: summary.maskedEmail ? "fernanda@gmail.com" : null,
  createdAt: "2026-11-20T12:00:00Z",
  documentType: summary.maskedDocument ? "CPF" : null,
  fullName: summary.fullName,
  hasAccess: false,
  id: summary.id,
  loginEmail: null,
  maskedDocument: summary.maskedDocument,
  nickname: null,
  phone: summary.phone,
  socialName: null,
  status: summary.status,
  units: ((summary.unitIds as number[] | undefined) ?? [1]).map(unitRef),
  updatedAt: "2026-11-20T12:00:00Z",
  version: 0,
})

const linkedStudentNames = ["Ana Beatriz Souza", "Bruno Lima"]

// The detail of a guardian: one active link for each student counted.
const toGuardianProfile = (guardian: Item): Item => ({
  guardian,
  sections: ["IDENTITY", "STUDENTS", "DOCUMENTS", "HISTORY"],
  students: Array.from({ length: Number(guardian.activeStudents) }, (_, index) => ({
    consentAt: "2026-11-20T12:00:00Z",
    consentTermsVersion: "v1",
    contactAuthorized: true,
    endDate: null,
    endReason: null,
    financialResponsible: index === 0,
    guardian: { code: null, id: guardian.id, name: guardian.fullName },
    id: 800 + index,
    pedagogicalResponsible: true,
    relationshipCode: "MOTHER",
    relationshipLabel: "Mãe",
    startDate: "2026-02-01",
    status: "ACTIVE",
    student: { code: `ALU-00000${index + 1}`, id: 201 + index, name: linkedStudentNames[index] },
    version: 0,
  })),
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

  // A JSON body is kept parsed; a file upload (multipart), as the raw text, where the file name shows.
  const readBody = (request: Request) => {
    const raw = request.postData()
    if (!raw) return undefined
    if (!(request.headers()["content-type"] ?? "").includes("application/json")) return raw
    return request.postDataJSON()
  }

  const record = (request: Request) => {
    const url = new URL(request.url())
    const call: RecordedCall = {
      body: readBody(request),
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
  const anonymized = new Set<number>()

  // The links (active and ended, never deleted) and the guardian invitations.
  const links: Item[] = studentList.flatMap(initialLinks)
  const invitations: Item[] = (options.invitations ?? []).map((item) => ({ ...item }))
  const guardianSummaries = new Map<number, Item>(guardianList.map((item) => [item.id as number, withoutUnitIds(item)]))
  guardianSummaries.set(otherUnitGuardian.id, {
    activeStudents: 0,
    fullName: otherUnitGuardian.name,
    hasFinancialLink: false,
    id: otherUnitGuardian.id,
    maskedDocument: null,
    maskedEmail: "a*****@escola.com",
    phone: null,
    status: "ACTIVE",
  })
  let nextLinkId = 900
  let nextInvitationId = 70
  let linkChanged = false

  const toProfile = (student: Item): Item => ({
    guardianInvitations: invitations.filter((item) => item.studentId === student.id),
    guardians: links
      .filter((link) => (link.student as Item).id === student.id)
      .map((link) => ({ guardian: guardianSummaries.get((link.guardian as Item).id as number), link })),
    sections: ["IDENTITY", "GUARDIANS", "INVITATIONS", "DOCUMENTS", "HISTORY"],
    student,
  })

  // A new active link: the student loses the NO_GUARDIAN blocker.
  const addLink = (student: Item, guardianId: number, body: Item, consent: boolean): Item => {
    const guardian = guardianSummaries.get(guardianId) as Item
    const link = {
      consentAt: consent ? "2026-11-23T12:00:00Z" : null,
      consentTermsVersion: consent ? "v1" : null,
      contactAuthorized: body.contactAuthorized ?? true,
      endDate: null,
      endReason: null,
      financialResponsible: body.financialResponsible ?? false,
      guardian: { code: null, id: guardianId, name: guardian.fullName },
      id: nextLinkId++,
      pedagogicalResponsible: body.pedagogicalResponsible ?? true,
      relationshipCode: body.relationshipCode,
      relationshipLabel: relationshipLabel(body.relationshipCode),
      startDate: body.startDate ?? today(),
      status: "ACTIVE",
      student: { code: student.studentCode, id: student.id, name: student.fullName },
      version: 0,
    }
    links.push(link)
    records.set(student.id as number, {
      ...student,
      activationBlockers: (student.activationBlockers as string[]).filter((blocker) => blocker !== "NO_GUARDIAN"),
    })
    return link
  }

  await page.route("**/api/catalogs/relationship-types", (route) => route.fulfill(apiAnswer(relationshipTypes)))

  // The exact check in every unit: the e-mail of the guardian of another unit finds it, out of reach.
  await page.route("**/api/people/check", (route) => {
    const call = record(route.request())
    const body = call.body as Item
    if (body.email !== otherUnitGuardian.email) {
      return route.fulfill(apiAnswer({ candidates: [], found: false, strength: null }))
    }
    return route.fulfill(
      apiAnswer({
        candidates: [
          {
            fullName: null,
            id: null,
            inScope: false,
            maskedDocument: null,
            maskedEmail: "a*****@escola.com",
            partialName: "Antônio R.",
            ref: otherUnitGuardian.ref,
            signals: ["EMAIL"],
            strong: true,
            types: ["GUARDIAN"],
          },
        ],
        found: true,
        strength: "STRONG",
      }),
    )
  })

  await page.route("**/api/student-guardian-links", (route) => {
    const call = record(route.request())
    const body = call.body as Item
    const student = records.get(Number(body.studentId))
    if (!student) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))
    if (body.consentConfirmed !== true) return route.fulfill(apiError(422, "CONSENT_REQUIRED"))

    const guardianId = body.reuseRef === otherUnitGuardian.ref ? otherUnitGuardian.id : Number(body.guardianId)
    const guardian = guardianSummaries.get(guardianId)
    if (!guardian) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))
    if (guardian.status === "INACTIVE") return route.fulfill(apiError(422, "GUARDIAN_INACTIVE"))
    const duplicate = links.some(
      (link) =>
        link.status === "ACTIVE" &&
        (link.student as Item).id === student.id &&
        (link.guardian as Item).id === guardianId,
    )
    if (duplicate) return route.fulfill(apiError(409, "LINK_DUPLICATE"))

    return route.fulfill(apiAnswer(addLink(student, guardianId, body, true)))
  })

  await page.route(/\/api\/student-guardian-links\/\d+(\/end)?$/, (route) => {
    const call = record(route.request())
    const [, id, end] = /\/api\/student-guardian-links\/(\d+)(\/end)?$/.exec(call.path) ?? []
    const index = links.findIndex((link) => link.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "LINK_NOT_FOUND"))
    const link = links[index]

    if (call.method === "GET") return route.fulfill(apiAnswer(link))

    // Someone else changes the link first: the relationship becomes "Avó" and the version moves on.
    if (options.changedLinkId === link.id && !linkChanged) {
      linkChanged = true
      links[index] = {
        ...link,
        relationshipCode: "GRANDMOTHER",
        relationshipLabel: "Avó",
        version: Number(link.version) + 1,
      }
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }

    const body = call.body as Item
    if (body.version !== link.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    if (link.status !== "ACTIVE") return route.fulfill(apiError(409, "LINK_ENDED"))

    if (!end) {
      const updated = {
        ...link,
        ...body,
        relationshipLabel: relationshipLabel(body.relationshipCode),
        version: Number(link.version) + 1,
      }
      links[index] = updated
      return route.fulfill(apiAnswer(updated))
    }

    if (!String(body.reason ?? "").trim()) return route.fulfill(apiError(422, "REASON_REQUIRED"))
    const studentId = (link.student as Item).id as number
    const student = records.get(studentId) as Item
    const others = links.filter(
      (item) => item.id !== link.id && item.status === "ACTIVE" && (item.student as Item).id === studentId,
    )
    if (student.status === "ACTIVE" && others.length === 0 && !body.exceptionReason) {
      return route.fulfill(apiError(422, "LAST_GUARDIAN"))
    }
    const ended = {
      ...link,
      endDate: body.endDate ?? today(),
      endReason: body.reason,
      status: "ENDED",
      version: Number(link.version) + 1,
    }
    links[index] = ended
    return route.fulfill(apiAnswer(ended))
  })

  await page.route(/\/api\/students\/\d+\/guardian-invitations$/, (route) => {
    const call = record(route.request())
    const studentId = Number(/\/api\/students\/(\d+)\//.exec(call.path)?.[1])
    if (!records.get(studentId)) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))
    if (call.method === "GET")
      return route.fulfill(apiAnswer(invitations.filter((item) => item.studentId === studentId)))

    const body = call.body as Item
    if (body.email === "fernanda@gmail.com") return route.fulfill(apiError(409, "USER_DUPLICATE"))
    const guardianId = body.guardianId ? Number(body.guardianId) : null
    const invitation = {
      channelResult: "SENT",
      contactAuthorized: body.contactAuthorized ?? true,
      email: body.email,
      expiresAt: "2026-11-25T12:00:00Z",
      financialResponsible: body.financialResponsible ?? false,
      guardianId,
      guardianName: guardianId ? (guardianSummaries.get(guardianId)?.fullName ?? null) : null,
      id: nextInvitationId++,
      invitationId: 20,
      invitationStatus: "PENDING",
      linkId: null,
      pedagogicalResponsible: body.pedagogicalResponsible ?? true,
      relationshipCode: body.relationshipCode,
      status: "WAITING_ACCEPTANCE",
      studentId,
    }
    invitations.unshift(invitation)
    return route.fulfill(apiAnswer(invitation))
  })

  await page.route(/\/api\/students\/\d+\/guardian-invitations\/\d+\/(confirm|reject)$/, (route) => {
    const call = record(route.request())
    const [, studentId, id, decision] =
      /\/api\/students\/(\d+)\/guardian-invitations\/(\d+)\/(confirm|reject)$/.exec(call.path) ?? []
    const index = invitations.findIndex((item) => item.id === Number(id) && item.studentId === Number(studentId))
    if (index < 0) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))
    const invitation = invitations[index]
    if (invitation.status !== "AWAITING_CONFIRMATION") {
      return route.fulfill(apiError(409, "INVITATION_LINK_STATE_INVALID"))
    }

    if (decision === "reject") {
      invitations[index] = { ...invitation, status: "REJECTED" }
      return route.fulfill(apiAnswer(invitations[index]))
    }
    const student = records.get(Number(studentId)) as Item
    const link = addLink(student, invitation.guardianId as number, invitation, true)
    invitations[index] = { ...invitation, linkId: link.id, status: "CONFIRMED" }
    return route.fulfill(apiAnswer(link))
  })

  await page.route("**/api/catalogs/document-types", (route) => route.fulfill(apiAnswer(documentTypes)))

  await page.route(/\/api\/students\/\d+(\/[a-z-]+)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/students\/(\d+)(?:\/([a-z-]+))?$/.exec(call.path) ?? []
    const student = records.get(Number(id))
    if (!student) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(student))
    if (action === "profile") return route.fulfill(apiAnswer(toProfile(student)))
    // The invitations have their own route.
    if (action === "guardian-invitations") return route.fallback()

    const body = call.body as Item
    if (anonymized.has(Number(id))) return route.fulfill(apiError(409, "PERSON_ANONYMIZED"))
    if (body.version !== student.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    if (body.fullName === unexpectedFailureName) return route.fulfill(unexpectedFailure)

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

  // The guardians' records. Guardian 301 is the only guardian of an active student: inactivating it is
  // refused (LAST_GUARDIAN).
  const guardianRecords = new Map<number, Item>(guardianList.map((item) => [item.id as number, toGuardian(item)]))
  let nextGuardianId = 350

  await page.route(/\/api\/guardians\/\d+(\/[a-z-]+)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/guardians\/(\d+)(?:\/([a-z-]+))?$/.exec(call.path) ?? []
    const guardian = guardianRecords.get(Number(id))
    if (!guardian) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(guardian))
    if (action === "profile") return route.fulfill(apiAnswer(toGuardianProfile(guardian)))

    const body = call.body as Item
    if (anonymized.has(Number(id))) return route.fulfill(apiError(409, "PERSON_ANONYMIZED"))
    if (body.version !== guardian.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (!action && call.method === "PUT") {
      const updated = { ...guardian, ...body, version: Number(guardian.version) + 1 }
      guardianRecords.set(Number(id), updated)
      return route.fulfill(apiAnswer(updated))
    }

    if (action === "inactivate" && guardian.id === 301) return route.fulfill(apiError(422, "LAST_GUARDIAN"))

    const changed = { ...guardian, status: nextStatus[action], version: Number(guardian.version) + 1 }
    guardianRecords.set(Number(id), changed)
    return route.fulfill(apiAnswer(changed))
  })

  await page.route("**/api/guardians", (route) => {
    const call = record(route.request())
    const body = call.body as Item
    if (options.duplicateEmail && body.contactEmail === options.duplicateEmail && !body.duplicateReviewId) {
      return route.fulfill(apiError(409, "DUPLICATE_REVIEW_REQUIRED"))
    }
    if (body.documentNumber === "11122233344") return route.fulfill(apiError(409, "DOCUMENT_IN_USE"))

    const id = nextGuardianId++
    const created = {
      ...toGuardian({
        activeStudents: 0,
        fullName: body.fullName,
        id,
        maskedDocument: body.documentNumber ? "***.***.***-**" : null,
        maskedEmail: null,
        phone: body.phone ?? null,
        status: "ACTIVE",
        unitIds: [body.unitId],
      }),
      contactEmail: body.contactEmail ?? null,
    }
    guardianRecords.set(id, created)
    return route.fulfill(apiAnswer(created))
  })

  // The LGPD tools (Admin): the export of everything kept, the anonymization of an inactive person (with
  // the protocol of the request; afterwards any change answers 409 PERSON_ANONYMIZED) and the cleanup of
  // abandoned drafts, which removes the drafts without a guardian.
  await page.route(/\/api\/people\/\d+\/(anonymize|export)$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/people\/(\d+)\/(anonymize|export)$/.exec(call.path) ?? []
    const personId = Number(id)
    const student = records.get(personId)
    const guardian = guardianRecords.get(personId)
    const person = student ?? guardian
    if (!person) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))

    if (action === "export") {
      return route.fulfill(
        apiAnswer({
          cadastre: { birthDate: person.birthDate ?? null, contactEmail: person.contactEmail ?? null },
          documents: documentsByPerson.get(personId) ?? [],
          person: { fullName: person.fullName, id: personId, nickname: person.nickname ?? null },
        }),
      )
    }

    if (anonymized.has(personId)) return route.fulfill(apiAnswer(null))
    const ref = String((call.body as Item | undefined)?.requestRef ?? "").trim()
    if (ref.length < 3 || ref.length > 60) return route.fulfill(apiError(422, "REQUEST_REF_REQUIRED"))
    if (person.status !== "INACTIVE") return route.fulfill(apiError(422, "MUST_BE_INACTIVE"))

    anonymized.add(personId)
    const erased = { contactEmail: null, fullName: "Pessoa anonimizada", maskedDocument: null, phone: null }
    if (student) records.set(personId, { ...student, ...erased })
    else guardianRecords.set(personId, { ...person, ...erased })
    return route.fulfill(apiAnswer(null))
  })

  await page.route("**/api/people/maintenance/draft-cleanup", (route) => {
    record(route.request())
    const drafts = studentList.filter((item) => item.status === "DRAFT" && item.activeGuardians === 0)
    drafts.forEach((draft) => studentList.splice(studentList.indexOf(draft), 1))
    return route.fulfill(apiAnswer({ removedDrafts: drafts.length }))
  })

  // The personal documents, kept like the backend keeps them (never deleted; every change bumps the
  // version). The file's content isn't checked here: its name comes from the multipart body.
  const documentsByPerson = new Map<number, Item[]>(
    Object.entries(options.documents ?? initialDocuments).map(([id, items]) => [
      Number(id),
      items.map((item) => ({ ...item })),
    ]),
  )
  let nextDocumentId = 560

  await page.route(/\/api\/people\/\d+\/documents$/, (route) => {
    const call = record(route.request())
    const personId = Number(/\/api\/people\/(\d+)\//.exec(call.path)?.[1])
    const documents = documentsByPerson.get(personId) ?? []
    if (call.method === "GET") return route.fulfill(apiAnswer(documents))

    const body = call.body as Item
    const type = documentTypes.find((item) => item.code === body.documentType)
    if (!type) return route.fulfill(apiError(422, "DOCUMENT_TYPE_INVALID"))
    if (body.expiresOn && !type.hasExpiry) return route.fulfill(apiError(422, "EXPIRY_NOT_APPLICABLE"))
    const created = {
      contentType: null,
      documentType: type.code,
      documentTypeLabel: type.label,
      expiresOn: body.expiresOn ?? null,
      fileName: null,
      fileSize: null,
      hasFile: false,
      id: nextDocumentId++,
      issuedOn: body.issuedOn ?? null,
      maskedNumber: body.documentNumber ? `***${String(body.documentNumber).slice(-4)}` : null,
      status: "NO_FILE",
      version: 0,
    }
    documentsByPerson.set(personId, [created, ...documents])
    return route.fulfill(apiAnswer(created))
  })

  await page.route(/\/api\/people\/\d+\/documents\/\d+\/(file|download|archive)(\?.*)?$/, (route) => {
    const call = record(route.request())
    const [, personId, documentId, action] =
      /\/api\/people\/(\d+)\/documents\/(\d+)\/(file|download|archive)$/.exec(call.path) ?? []
    const documents = documentsByPerson.get(Number(personId)) ?? []
    const index = documents.findIndex((item) => item.id === Number(documentId))
    if (index < 0) return route.fulfill(apiError(404, "PERSON_NOT_FOUND"))
    const document = documents[index]

    if (action === "download") {
      if (!document.hasFile) return route.fulfill(apiError(404, "FILE_NOT_FOUND"))
      return route.fulfill(
        apiAnswer({ expiresInSeconds: 300, fileName: document.fileName, url: `${filesHost}/${document.id}` }),
      )
    }

    if (Number(call.query.version) !== document.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    if (action === "archive") {
      documents[index] = { ...document, status: "ARCHIVED", version: Number(document.version) + 1 }
      return route.fulfill(apiAnswer(documents[index]))
    }

    if (document.status === "ARCHIVED") return route.fulfill(apiError(409, "DOCUMENT_ARCHIVED"))
    if (options.storageDisabled) return route.fulfill(apiError(503, "STORAGE_DISABLED"))
    const fileName = /filename="([^"]+)"/.exec(String(call.body ?? ""))?.[1] ?? "arquivo.pdf"
    documents[index] = {
      ...document,
      contentType: fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      fileName,
      fileSize: 120_000,
      hasFile: true,
      status: document.status === "EXPIRED" ? "EXPIRED" : "VALID",
      version: Number(document.version) + 1,
    }
    return route.fulfill(apiAnswer(documents[index]))
  })

  // Where a download link points (opened in a new tab, so routed for the whole context): the file as it is.
  await page
    .context()
    .route(`${filesHost}/**`, (route) =>
      route.fulfill({ body: "%PDF-1.4 documento", contentType: "application/pdf", status: 200 }),
    )

  // The registration history of a student or a guardian, paged (newest first).
  await page.route(/\/api\/(students|guardians)\/\d+\/history(\?.*)?$/, (route) => {
    const call = record(route.request())
    const [, kind, id] = /\/api\/(students|guardians)\/(\d+)\/history$/.exec(call.path) ?? []
    const events = kind === "students" ? studentHistory(Number(id)) : guardianHistory(Number(id))
    return route.fulfill(apiAnswer(toPage(events, call.query)))
  })

  await page.route(/\/api\/users\/\d+\/temporary-password$/, (route) => {
    record(route.request())
    return route.fulfill(apiAnswer({ expiresAt: "2026-11-30T15:00:00Z", temporaryPassword: "Kx7mPq2Rt9Wz4N" }))
  })

  return { calls }
}
