import type { Request } from "@playwright/test"

import { documentTypes, relationshipTypes } from "./people.ts"
import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall, units } from "./userAccess.ts"

// A mocked backend for the enrollments (EPIC 6, P05 slices 0 to 2 part 1): the enrollments, the students
// that may be prepared, the history, each kept like the backend keeps them, plus every call recorded for
// the specs to check what was sent. A preparation's pendencies are worked out again on every change.

type Item = Record<string, unknown>

export type EnrollmentOptions = {
  // Someone else changes the enrollment before the first save of the guardians: it gets 409 VERSION_CONFLICT.
  conflictOnFirstSave?: boolean
  // The school published documents for Ana's preparation (501): her identity document, her transcript
  // (with an exception the Secretaria asked for) and a proof of residence, all mandatory.
  documents?: boolean
  // The person only reads (a Financeiro, a Coordenação): no enrollment offers an action.
  readOnly?: boolean
  // Ana's preparation (501) already has her mother as financial party and signatory and the class with
  // seats: only the start date is missing before it can be confirmed.
  readyButStartDate?: boolean
}

// Today as the screen counts it (the browser's local day), the same machine and time zone as this mock.
const today = () => new Date().toLocaleDateString("en-CA")

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

// The classes of Unidade Aldeota open for enrollment: one with seats, one full, and one whose occupation
// couldn't be read (unavailable, never zero).
const classesByUnit: Record<number, Item[]> = {
  1: [
    {
      capacity: 30,
      classId: 701,
      classStatus: "ACTIVE",
      code: "1A",
      eligible: true,
      name: "1º ano A",
      occupation: { asOf: "2026-11-24T15:00:00Z", status: "AVAILABLE", value: 28 },
      seats: 2,
      shift: "MANHA",
    },
    {
      capacity: 25,
      classId: 702,
      classStatus: "ACTIVE",
      code: "1B",
      eligible: true,
      name: "1º ano B",
      occupation: { asOf: "2026-11-24T15:00:00Z", status: "AVAILABLE", value: 25 },
      seats: 0,
      shift: "TARDE",
    },
    {
      capacity: 20,
      classId: 703,
      classStatus: "ACTIVE",
      code: "1C",
      eligible: true,
      name: "1º ano C",
      occupation: { asOf: null, status: "UNAVAILABLE", value: null },
      seats: null,
      shift: "INTEGRAL",
    },
  ],
}

// What a preparation still lacks, worked out like the backend does.
const pendenciesOf = (enrollment: Item, documentsOpen = false) => {
  if (!preparation.includes(String(enrollment.status))) return []
  const student = enrollment.student as Item
  const parties = enrollment.parties as Item[]
  const active = parties.filter((party) => party.linkActive)
  const items: { category: string; code: string }[] = []
  const startDate = enrollment.startDate as string | null
  if (!student.eligible) items.push({ category: "STUDENT", code: "STUDENT_NOT_ELIGIBLE" })
  if (parties.length === 0) items.push({ category: "GUARDIANS", code: "NO_PARTY" })
  if (parties.some((party) => !party.linkActive)) items.push({ category: "GUARDIANS", code: "PARTY_LINK_ENDED" })
  if (!active.some((party) => party.financial)) items.push({ category: "GUARDIANS", code: "NO_FINANCIAL_PARTY" })
  if (!active.some((party) => party.signatory)) items.push({ category: "GUARDIANS", code: "NO_SIGNATORY" })
  const context = enrollment.classContext as Item | null
  if (!context) items.push({ category: "ACADEMIC_CONTEXT", code: "NO_CLASS" })
  else if (!context.eligible) items.push({ category: "ACADEMIC_CONTEXT", code: "CLASS_NOT_ELIGIBLE" })
  else if ((context.occupation as Item).status !== "AVAILABLE") {
    items.push({ category: "ACADEMIC_CONTEXT", code: "OCCUPANCY_UNAVAILABLE" })
  } else if (context.seats === 0) items.push({ category: "ACADEMIC_CONTEXT", code: "NO_SEAT" })
  if (!startDate) items.push({ category: "ACADEMIC_CONTEXT", code: "START_DATE_MISSING" })
  else if (startDate < today()) items.push({ category: "ACADEMIC_CONTEXT", code: "START_DATE_INVALID" })
  if (documentsOpen) items.push({ category: "DOCUMENTS", code: "DOCUMENTS_PENDING" })
  return items.map((item) => ({ ...item, message: `${item.code} (backend text)` }))
}

const enrollment = (fields: Item): Item => ({
  abandonReason: null,
  classContext: null,
  confirmedAt: null,
  createdAt: "2026-11-24T12:00:00Z",
  enrollmentNumber: null,
  inactive: false,
  kind: "NEW",
  startDate: null,
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
  enrollment({
    confirmedAt: "2026-11-24T16:00:00Z",
    enrollmentNumber: "2027-000041",
    id: 502,
    startDate: "2027-02-01",
    status: "ACTIVE",
    student: studentRef(202),
    unitId: 2,
    unitName: unitName(2),
  }),
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
  // The confirmations done, by intent: the same intent again gives the same result.
  const confirmations = new Map<string, number>()
  if (options.readyButStartDate) {
    const ana = records.get(501) as Item
    records.set(501, {
      ...ana,
      classContext: classesByUnit[1][0],
      parties: [
        {
          financial: true,
          guardianId: 301,
          guardianName: "Fernanda Souza",
          linkActive: true,
          linkId: 2010,
          relationshipCode: "MOTHER",
          signatory: true,
        },
      ],
    })
  }

  // The school's requirements for Ana's preparation, and what was attached to each (by requirement).
  const requirements: Item[] = options.documents
    ? [
        {
          acceptedTypes: ["RG"],
          code: "STUDENT_ID",
          exemptable: false,
          label: "Documento de identidade",
          requirementId: 11,
        },
        { acceptedTypes: [], code: "TRANSCRIPT", exemptable: true, label: "Histórico escolar", requirementId: 12 },
        {
          acceptedTypes: [],
          code: "RESIDENCE",
          exemptable: true,
          label: "Comprovante de residência",
          requirementId: 13,
        },
      ]
    : []
  const attached = new Map<number, Item>()
  const exceptions: Item[] = options.documents
    ? [
        {
          decidedAt: null,
          decidedBy: null,
          decisionReason: null,
          dueDate: null,
          id: 801,
          overdue: false,
          personId: null,
          personName: null,
          reason: "A escola de origem ainda não emitiu o histórico",
          requestedAt: "2026-11-24T12:00:00Z",
          requestedBy: 2,
          requirementCode: "TRANSCRIPT",
          requirementId: 12,
          status: "REQUESTED",
          version: 0,
        },
      ]
    : []
  let nextItemId = 900
  let nextExceptionId = 802
  if (options.documents) {
    const ana = records.get(501) as Item
    records.set(501, { ...ana, notEvaluated: ["FINANCIAL_CONDITIONS", "CONTRACT"] })
  }

  // A line of the checklist, worked out like the backend does: an approved exception covers the line
  // (EXCEPTED) without making it look delivered.
  const checklistLine = (requirement: Item): Item => {
    const item = attached.get(requirement.requirementId as number)
    const exception =
      exceptions.find((entry) => entry.requirementId === requirement.requirementId && entry.status !== "DENIED") ?? null
    let status = item ? String(item.status) : "PENDING"
    if (status !== "APPROVED" && exception?.status === "APPROVED") status = "EXCEPTED"
    const satisfied = status === "APPROVED" || status === "EXCEPTED"
    const actions = ["UPLOAD"]
    if (item) actions.push("DOWNLOAD")
    if (status === "RECEIVED") actions.push("APPROVE", "REJECT")
    if (requirement.exemptable && !satisfied && !exception) actions.push("REQUEST_EXCEPTION")
    return {
      acceptedTypes: requirement.acceptedTypes,
      blocking: !satisfied,
      code: requirement.code,
      document: item ? (item.document as Item) : null,
      eligibleActions: options.readOnly ? [] : actions,
      exception,
      exemptable: requirement.exemptable,
      itemId: item ? item.itemId : null,
      itemVersion: item ? item.version : null,
      label: requirement.label,
      mandatory: true,
      party: "STUDENT",
      personId: null,
      personName: null,
      rejectReason: item ? (item.rejectReason ?? null) : null,
      requirementId: requirement.requirementId,
      satisfied,
      status,
      validUntil: null,
    }
  }
  const checklist = (enrollmentId: number) => {
    const items = enrollmentId === 501 ? requirements.map(checklistLine) : []
    return {
      enrollmentId,
      items,
      openCodes: items.filter((item) => item.blocking).map((item) => item.code),
      published: items.length > 0,
    }
  }
  const documentsOpen = (enrollmentId: number) => checklist(enrollmentId).openCodes.length > 0

  const record = (request: Request) => {
    const url = new URL(request.url())
    const raw = request.postData()
    // A JSON body is kept parsed; a file upload (multipart), as the raw text, where the file name shows.
    const isJson = (request.headers()["content-type"] ?? "").includes("application/json")
    const call: RecordedCall = {
      body: raw && isJson ? request.postDataJSON() : (raw ?? undefined),
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
  const view = (item: Item): Item => {
    const pendencies = pendenciesOf(item, documentsOpen(item.id as number))
    const operates = !options.readOnly && preparation.includes(String(item.status))
    const actions = operates ? ["CHOOSE_PARTIES", "CHOOSE_CONTEXT", "SET_START_DATE", "ABANDON"] : []
    if (operates && pendencies.length === 0) actions.push("CONFIRM")
    return { ...item, eligibleActions: actions, pendencies }
  }

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

  await page.route(/\/api\/enrollments\/\d+(\/[a-z-]+)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /\/api\/enrollments\/(\d+)(?:\/([a-z-]+))?/.exec(call.path) ?? []
    const current = records.get(Number(id))
    if (!current) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(view(current)))
    if (action === "history") {
      return route.fulfill(apiAnswer(toPage(events.get(Number(id)) ?? [], call.query)))
    }

    const links = linksByStudent[Number((current.student as Item).id)] ?? []
    const parties = current.parties as Item[]

    if (action === "classes") return route.fulfill(apiAnswer(classesByUnit[Number(current.unitId)] ?? []))

    if (action === "context") {
      const body = call.body as { classId: number | null; version: number }
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const chosen = (classesByUnit[Number(current.unitId)] ?? []).find((item) => item.classId === body.classId)
      if (body.classId !== null && !chosen) return route.fulfill(apiError(422, "ENROLLMENT_CONTEXT_INVALID"))
      const changed = {
        ...current,
        classContext: chosen ?? null,
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      records.set(Number(id), changed)
      addEvent(Number(id), { action: "CONTEXT_CHANGED", category: "CONTEXT", changedFields: "class" })
      return route.fulfill(apiAnswer(view(changed)))
    }

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

    if (action === "start-date") {
      const body = call.body as { startDate: string | null; version: number }
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      // The class comes first, and the day is today or later.
      if (body.startDate !== null && (!current.classContext || body.startDate < today())) {
        return route.fulfill(apiError(422, "ENROLLMENT_START_DATE_INVALID"))
      }
      const changed = {
        ...current,
        startDate: body.startDate,
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      records.set(Number(id), changed)
      addEvent(Number(id), { action: "START_DATE_CHANGED", category: "CONTEXT", changedFields: "startDate" })
      return route.fulfill(apiAnswer(view(changed)))
    }

    if (action === "confirm") {
      const body = call.body as { intent: string; version: number }
      const done = confirmations.get(body.intent)
      if (done === Number(id)) return route.fulfill(apiAnswer(view(current)))
      if (done !== undefined) return route.fulfill(apiError(409, "CONFIRMATION_INTENT_REUSED"))
      if (!preparation.includes(String(current.status))) {
        return route.fulfill(apiError(409, "ENROLLMENT_ALREADY_CONFIRMED"))
      }
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (pendenciesOf(current, documentsOpen(Number(id))).length > 0) {
        return route.fulfill(apiError(422, "ENROLLMENT_NOT_READY"))
      }
      const changed = {
        ...current,
        confirmedAt: new Date().toISOString(),
        enrollmentNumber: "2027-000042",
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      records.set(Number(id), changed)
      confirmations.set(body.intent, Number(id))
      addEvent(Number(id), {
        action: "CONFIRMED",
        afterValue: "ACTIVE",
        beforeValue: current.status,
        category: "STATUS",
        changedFields: "status,enrollmentNumber,startDate",
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

  await page.route("**/api/catalogs/document-types", (route) => route.fulfill(apiAnswer(documentTypes)))

  // The documents and the exceptions (registered last, so they answer before the route above).
  await page.route(/\/api\/enrollments\/\d+\/(documents|exceptions)(\/.*)?$/, (route) => {
    const call = record(route.request())
    const enrollmentId = Number(/\/api\/enrollments\/(\d+)\//.exec(call.path)?.[1])
    const rest = call.path.replace(/^\/api\/enrollments\/\d+\//, "")
    const bumpEnrollment = () => {
      const current = records.get(enrollmentId) as Item
      records.set(enrollmentId, { ...current, version: Number(current.version) + 1 })
    }

    if (rest === "documents" && call.method === "GET") return route.fulfill(apiAnswer(checklist(enrollmentId)))

    const upload = /^documents\/(\d+)\/file$/.exec(rest)
    if (upload) {
      const requirement = requirements.find((item) => item.requirementId === Number(upload[1]))
      if (!requirement) return route.fulfill(apiError(404, "REQUIREMENT_NOT_FOUND"))
      const raw = String(call.body ?? "")
      const documentType = /name="documentType"\r\n\r\n([^\r]*)/.exec(raw)?.[1] ?? ""
      const accepted = requirement.acceptedTypes as string[]
      if (accepted.length > 0 && !accepted.includes(documentType)) {
        return route.fulfill(apiError(422, "ENROLLMENT_DOCUMENT_INVALID"))
      }
      const fileName = /filename="([^"]*)"/.exec(raw)?.[1] ?? null
      const previous = attached.get(requirement.requirementId as number)
      attached.set(requirement.requirementId as number, {
        document: {
          documentType,
          documentTypeLabel: documentTypes.find((item) => item.code === documentType)?.label ?? null,
          expiresOn: null,
          fileName,
          hasFile: true,
          id: nextItemId + 100,
          issuedOn: null,
        },
        itemId: previous?.itemId ?? nextItemId++,
        rejectReason: null,
        status: "RECEIVED",
        version: previous ? Number(previous.version) + 1 : 0,
      })
      bumpEnrollment()
      return route.fulfill(apiAnswer(checklist(enrollmentId)))
    }

    const itemAction = /^documents\/items\/(\d+)\/(review|download)$/.exec(rest)
    if (itemAction) {
      const entry = [...attached.entries()].find(([, item]) => item.itemId === Number(itemAction[1]))
      if (!entry) return route.fulfill(apiError(404, "ENROLLMENT_DOCUMENT_NOT_FOUND"))
      const [requirementId, item] = entry
      if (itemAction[2] === "download") {
        return route.fulfill(apiAnswer({ expiresAt: new Date().toISOString(), url: "about:blank" }))
      }
      const body = call.body as { decision: string; reason?: string; version: number }
      if (body.version !== item.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (body.decision === "REJECT" && !body.reason) return route.fulfill(apiError(422, "REASON_REQUIRED"))
      attached.set(requirementId, {
        ...item,
        rejectReason: body.decision === "REJECT" ? body.reason : null,
        status: body.decision === "REJECT" ? "REJECTED" : "APPROVED",
        version: Number(item.version) + 1,
      })
      bumpEnrollment()
      return route.fulfill(apiAnswer(checklist(enrollmentId)))
    }

    if (rest === "exceptions" && call.method === "GET") {
      return route.fulfill(apiAnswer(enrollmentId === 501 ? exceptions : []))
    }

    if (rest === "exceptions" && call.method === "POST") {
      const body = call.body as { reason: string; requirementId: number }
      const requirement = requirements.find((item) => item.requirementId === body.requirementId)
      if (!requirement) return route.fulfill(apiError(422, "EXCEPTION_REQUIREMENT_INVALID"))
      if (!requirement.exemptable) return route.fulfill(apiError(422, "EXCEPTION_NOT_ALLOWED"))
      if (exceptions.some((item) => item.requirementId === body.requirementId && item.status !== "DENIED")) {
        return route.fulfill(apiError(409, "EXCEPTION_OPEN"))
      }
      const created = {
        decidedAt: null,
        decidedBy: null,
        decisionReason: null,
        dueDate: null,
        id: nextExceptionId++,
        overdue: false,
        personId: null,
        personName: null,
        reason: body.reason,
        requestedAt: new Date().toISOString(),
        requestedBy: 1,
        requirementCode: requirement.code,
        requirementId: requirement.requirementId,
        status: "REQUESTED",
        version: 0,
      }
      exceptions.push(created)
      return route.fulfill(apiAnswer(created))
    }

    const decision = /^exceptions\/(\d+)\/decision$/.exec(rest)
    if (decision) {
      const index = exceptions.findIndex((item) => item.id === Number(decision[1]))
      if (index < 0) return route.fulfill(apiError(404, "EXCEPTION_NOT_FOUND"))
      const current = exceptions[index]
      const body = call.body as { decision: string; dueDate?: string; reason: string; version: number }
      if (current.status !== "REQUESTED") return route.fulfill(apiError(409, "EXCEPTION_ALREADY_DECIDED"))
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      // The signed-in Admin of these specs is user 1: an exception they asked for isn't theirs to decide.
      if (current.requestedBy === 1) return route.fulfill(apiError(409, "EXCEPTION_SAME_PERSON"))
      const due = new Date()
      due.setDate(due.getDate() + 30)
      const approved = body.decision === "APPROVE"
      exceptions[index] = {
        ...current,
        decidedAt: new Date().toISOString(),
        decidedBy: 1,
        decisionReason: body.reason,
        dueDate: approved ? (body.dueDate ?? due.toLocaleDateString("en-CA")) : null,
        status: approved ? "APPROVED" : "DENIED",
        version: Number(current.version) + 1,
      }
      bumpEnrollment()
      return route.fulfill(apiAnswer(exceptions[index]))
    }

    return route.fallback()
  })

  return { calls, exceptions, records }
}
