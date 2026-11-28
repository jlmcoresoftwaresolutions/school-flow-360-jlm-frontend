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
  // The school approved a contract model (version 1), and Ana's preparation (501) is ready but for the
  // contract: her mother signs, the class and the start date are chosen.
  contract?: boolean
  // The school published documents for Ana's preparation (501): her identity document, her transcript
  // (with an exception the Secretaria asked for) and a proof of residence, all mandatory.
  documents?: boolean
  // Units that published the capacity exception for the lifecycle events, enabled.
  capacityEnabledUnits?: number[]
  // The destination class of a transfer or a re-enrollment is full: the event shows DESTINATION_FULL until
  // an Admin authorizes a seat above the limit, in a unit that enabled the capacity exception.
  destinationFull?: boolean
  // Units with a published lock policy (the maximum days, for every stage).
  lockPolicyUnits?: Record<number, number>
  // The Admin already published the five notification texts (none is published by default, as the backend).
  publishedTexts?: boolean
  // Homologation: a "no financial effect" rule for the whole unit is accepted (production asks for the offer).
  unitWideRules?: boolean
  // The first lifecycle event prepared gets no answer (the connection drops), though it was created.
  losePrepareAnswer?: boolean
  // Units with a published "no financial effect" rule for every event type, for the whole unit.
  noEffectUnits?: number[]
  // The person only reads (a Financeiro, a Coordenação): no enrollment offers an action.
  readOnly?: boolean
  // Ana also has her grandmother linked now, financial in Pessoas too: two candidates to pay.
  secondFinancialGuardian?: boolean
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
// Ana's grandmother, linked now and financial in Pessoas (the secondFinancialGuardian option).
const grandmotherLink: Item = {
  contactAuthorized: true,
  financialResponsible: true,
  guardianId: 303,
  guardianName: "Helena Souza",
  linkId: 2012,
  linkStatus: "ACTIVE",
  pedagogicalResponsible: false,
  relationshipCode: "GRANDMOTHER",
}

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
const pendenciesOf = (enrollment: Item, documentsOpen = false, contractOpen = false) => {
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
  if (contractOpen) items.push({ category: "CONTRACT", code: "CONTRACT_PENDING" })
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

// The stages of the academic catalog, for the requirements' selects.
const stages = [
  { eligibleActions: [], id: 1, name: "Educação Infantil", sortOrder: 1, status: "ACTIVE", version: 0 },
  { eligibleActions: [], id: 2, name: "Ensino Fundamental", sortOrder: 2, status: "ACTIVE", version: 0 },
]

// A requirement of the school's catalog as the backend answers it.
const requirement = (fields: Item): Item => ({
  acceptedTypes: [],
  active: false,
  code: "",
  enrollmentKind: "ALL",
  exemptable: true,
  label: "",
  mandatory: true,
  party: "STUDENT",
  sortOrder: 0,
  stageId: null,
  unitId: null,
  useDocumentExpiry: false,
  validFrom: "2026-11-24",
  validTo: null,
  validityDays: null,
  version: 0,
  ...fields,
})

// The controlled fields a contract model may use (the backend's ContractFields).
const contractFields = [
  "institution.name",
  "unit.name",
  "student.name",
  "student.code",
  "signatories",
  "class.name",
  "class.code",
  "stage.name",
  "grade.name",
  "period.name",
  "period.start",
  "period.end",
  "start.date",
  "today",
  "payers",
]

// A version of the contract model as the backend answers it.
const template = (fields: Item): Item => ({
  allowedFields: contractFields,
  approvedAt: null,
  body: "",
  code: "ENROLLMENT_CONTRACT",
  legalApprovalRef: null,
  status: "DRAFT",
  title: "",
  version: 0,
  versionNumber: 1,
  ...fields,
})

// The catalog the backend creates with the school: withdrawn, except the student's identity, published.
export const initialRequirements = (): Item[] => [
  requirement({
    acceptedTypes: ["RG", "CPF"],
    active: true,
    code: "STUDENT_ID",
    exemptable: false,
    id: 31,
    label: "Identificação do aluno",
  }),
  requirement({
    acceptedTypes: ["RG", "CPF"],
    code: "PROOF_OF_ADDRESS",
    id: 32,
    label: "Comprovante de endereço",
    validityDays: 90,
  }),
  requirement({
    acceptedTypes: ["RG"],
    code: "TRANSCRIPT",
    enrollmentKind: "TRANSFER",
    id: 33,
    label: "Histórico escolar",
    unitId: 1,
  }),
]

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

// The reasons of the lifecycle events, catalog version 1 (as the backend seeds them).
const lifecycleReasons = (
  [
    ["TRANSFER", "FAMILY_REQUEST", "Solicitação da família ou do aluno adulto", false],
    ["TRANSFER", "ADDRESS_CHANGE", "Mudança de endereço", false],
    ["TRANSFER", "PEDAGOGICAL_NEED", "Necessidade pedagógica", false],
    ["TRANSFER", "OTHER", "Outro", true],
    ["CANCELLATION", "LEGITIMATED_REQUEST", "Solicitação do legitimado", false],
    ["CANCELLATION", "LEFT_INSTITUTION", "Saída da instituição", false],
    ["CANCELLATION", "INSTITUTIONAL_DECISION", "Decisão institucional fundamentada", true],
    ["CANCELLATION", "OTHER", "Outro", true],
    ["REENROLLMENT", "CONTINUITY", "Continuidade no novo período", false],
    ["LOCK", "LEGITIMATED_REQUEST", "Solicitação do legitimado", false],
    ["LOCK", "TEMPORARY_IMPEDIMENT", "Impedimento temporário", false],
    ["LOCK", "OTHER", "Outro", true],
  ] as const
).map(([eventType, code, label, requiresJustification]) => ({
  catalogVersion: 1,
  code,
  eventType,
  label,
  requiresJustification,
}))

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

  // The contract models and the contract of each enrollment.
  const templates: Item[] = options.contract
    ? [
        template({
          approvedAt: "2026-11-24T12:00:00Z",
          body: "Contrato de matrícula de {{student.name}} na {{unit.name}}.",
          id: 71,
          legalApprovalRef: "Parecer 12/2026",
          status: "APPROVED",
          title: "Contrato de prestação de serviços educacionais",
        }),
      ]
    : []
  const contracts = new Map<number, Item>()
  let nextTemplateId = 72
  let nextContractId = 81
  let nextAcceptanceId = 91
  if (options.contract) {
    const ana = records.get(501) as Item
    records.set(501, {
      ...ana,
      classContext: classesByUnit[1][0],
      notEvaluated: ["FINANCIAL_CONDITIONS"],
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
      startDate: today(),
    })
  }
  // While a model is approved, the contract is a condition: generated, current and accepted by every signer.
  const contractOpen = (enrollment: Item) => {
    if (!templates.some((item) => item.status === "APPROVED")) return false
    const contract = contracts.get(enrollment.id as number)
    if (!contract || contract.outdated) return true
    const signers = (enrollment.parties as Item[]).filter((party) => party.signatory && party.linkActive)
    return signers.some(
      (party) =>
        !(contract.acceptances as Item[]).some(
          (entry) => entry.signerId === party.guardianId && entry.status === "ACCEPTED",
        ),
    )
  }

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
    const pendencies = pendenciesOf(item, documentsOpen(item.id as number), contractOpen(item))
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
        kind: body.kind ?? "NEW",
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

    const studentId = Number((current.student as Item).id)
    const links = [
      ...(linksByStudent[studentId] ?? []),
      ...(options.secondFinancialGuardian && studentId === 201 ? [grandmotherLink] : []),
    ]
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
      if (pendenciesOf(current, documentsOpen(Number(id)), contractOpen(current)).length > 0) {
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

  // The school's catalog of document requirements: only the Admin writes, nothing is deleted.
  const catalog: Item[] = initialRequirements()
  let nextRequirementId = 40

  await page.route("**/api/academic/stages?*", (route) =>
    route.fulfill(apiAnswer({ items: stages, page: 0, size: 100, totalElements: stages.length, totalPages: 1 })),
  )

  await page.route(/\/api\/enrollment-documents\/requirements(\/\d+(\/(activate|inactivate))?)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /requirements(?:\/(\d+)(?:\/(activate|inactivate))?)?$/.exec(call.path) ?? []
    if (call.method === "GET") return route.fulfill(apiAnswer(catalog))
    if (options.readOnly) return route.fulfill(apiError(403, "ACCESS_DENIED"))
    const body = call.body as Item
    const clashes = (candidate: Item) =>
      catalog.some(
        (item) =>
          item.id !== candidate.id &&
          item.code === candidate.code &&
          item.unitId === candidate.unitId &&
          item.stageId === candidate.stageId &&
          item.enrollmentKind === candidate.enrollmentKind,
      )

    if (!id) {
      const created = {
        ...requirement({ ...body, id: nextRequirementId++ }),
        active: false,
        version: 0,
      }
      if (clashes(created)) return route.fulfill(apiError(409, "REQUIREMENT_DUPLICATE"))
      catalog.push(created)
      return route.fulfill({ ...apiAnswer(created), status: 201 })
    }

    const index = catalog.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))
    const current = catalog[index]
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    // The code and whose document it is never change.
    const changed = action
      ? { ...current, active: action === "activate" }
      : {
          ...requirement({ ...body, code: current.code, id: current.id, party: current.party }),
          active: current.active,
        }
    if (!action && clashes(changed)) return route.fulfill(apiError(409, "REQUIREMENT_DUPLICATE"))
    catalog[index] = { ...changed, version: Number(current.version) + 1 }
    return route.fulfill(apiAnswer(catalog[index]))
  })

  // The document policy of each unit (EPIC 7, Fatia A): per unit, stage and kind, the catalog applies or
  // the unit has no blocking requirement. Nothing published is PENDING; a declaration that no longer
  // agrees with the catalog is INCONSISTENT.
  const policies: Item[] = []
  let nextPolicyId = 70

  const applicableRequirements = (unitId: number, stageId: number, kind: string) =>
    catalog.filter(
      (item) =>
        item.active &&
        (item.unitId === null || item.unitId === unitId) &&
        (item.stageId === null || item.stageId === stageId) &&
        (item.enrollmentKind === "ALL" || item.enrollmentKind === kind),
    )

  const policyState = (unitId: number, stageId: number, kind: string) => {
    const policy = policies.find(
      (item) => item.unitId === unitId && item.stageId === stageId && item.enrollmentKind === kind,
    )
    if (!policy || !policy.active) return "PENDING"
    const applicable = applicableRequirements(unitId, stageId, kind)
    if (policy.mode === "NO_BLOCKING_REQUIREMENTS") {
      return applicable.some((item) => item.mandatory) ? "INCONSISTENT" : "NO_BLOCKING"
    }
    return applicable.length === 0 ? "INCONSISTENT" : "USE_CATALOG"
  }

  await page.route(/\/api\/document-policies(\/.*)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const rest = call.path.replace(/^\/api\/document-policies\/?/, "")
    // The Secretaria reads the policies of its units; only the Admin writes.
    if (options.readOnly && call.method !== "GET") return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))

    if (rest === "state") {
      const { kind, stageId, unitId } = call.query
      const state = policyState(Number(unitId), Number(stageId), String(kind))
      return route.fulfill(
        apiAnswer({
          enrollmentKind: kind,
          message: `${state} (backend text)`,
          stageId: Number(stageId),
          state,
          unitId: Number(unitId),
        }),
      )
    }

    if (!rest && call.method === "GET") {
      const unitId = call.query.unitId
      return route.fulfill(apiAnswer(policies.filter((item) => !unitId || String(item.unitId) === unitId)))
    }

    if (!rest && call.method === "PUT") {
      const body = call.body as Item
      const applicable = applicableRequirements(Number(body.unitId), Number(body.stageId), String(body.enrollmentKind))
      if (body.mode === "NO_BLOCKING_REQUIREMENTS" && applicable.some((item) => item.mandatory)) {
        return route.fulfill(apiError(422, "DOCUMENT_POLICY_INVALID"))
      }
      if (body.mode === "USE_CATALOG" && applicable.length === 0) {
        return route.fulfill(apiError(422, "DOCUMENT_POLICY_INVALID"))
      }
      const index = policies.findIndex(
        (item) =>
          item.unitId === body.unitId && item.stageId === body.stageId && item.enrollmentKind === body.enrollmentKind,
      )
      const now = new Date().toISOString()
      if (index < 0) {
        const created = {
          active: true,
          enrollmentKind: body.enrollmentKind,
          id: nextPolicyId++,
          mode: body.mode,
          note: body.note ?? null,
          publishedAt: now,
          publishedBy: 1,
          stageId: body.stageId,
          unitId: body.unitId,
          version: 0,
        }
        policies.push(created)
        return route.fulfill(apiAnswer(created))
      }
      const current = policies[index]
      if (body.version === undefined) return route.fulfill(apiError(428, "VERSION_REQUIRED"))
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      policies[index] = {
        ...current,
        active: true,
        mode: body.mode,
        note: body.note ?? null,
        publishedAt: now,
        version: Number(current.version) + 1,
      }
      return route.fulfill(apiAnswer(policies[index]))
    }

    const withdraw = /^(\d+)\/withdraw$/.exec(rest)
    if (withdraw && call.method === "POST") {
      const index = policies.findIndex((item) => item.id === Number(withdraw[1]))
      if (index < 0) return route.fulfill(apiError(404, "DOCUMENT_POLICY_NOT_FOUND"))
      const current = policies[index]
      if ((call.body as Item).version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      policies[index] = { ...current, active: false, version: Number(current.version) + 1 }
      return route.fulfill(apiAnswer(policies[index]))
    }

    return route.fallback()
  })

  // The contract models: every version, at most one approved.
  await page.route(/\/api\/contract-templates(\/\d+(\/(approve|retire))?)?$/, (route) => {
    const call = record(route.request())
    const [, id, action] = /contract-templates(?:\/(\d+)(?:\/(approve|retire))?)?$/.exec(call.path) ?? []
    if (call.method === "GET") return route.fulfill(apiAnswer(templates))
    if (options.readOnly) return route.fulfill(apiError(403, "ACCESS_DENIED"))
    const body = (call.body ?? {}) as Item
    const unknownField = (text: string) =>
      [...text.matchAll(/\{\{\s*([a-z.]+)\s*\}\}/g)].some((match) => !contractFields.includes(match[1]))

    if (!id) {
      if (unknownField(String(body.body))) return route.fulfill(apiError(422, "CONTRACT_FIELD_UNKNOWN"))
      const created = template({
        body: body.body,
        id: nextTemplateId++,
        title: body.title,
        versionNumber: Math.max(0, ...templates.map((item) => Number(item.versionNumber))) + 1,
      })
      templates.push(created)
      return route.fulfill({ ...apiAnswer(created), status: 201 })
    }

    const index = templates.findIndex((item) => item.id === Number(id))
    if (index < 0) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))
    const current = templates[index]
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    const bump = (fields: Item) => {
      templates[index] = { ...current, ...fields, version: Number(current.version) + 1 }
      return route.fulfill(apiAnswer(templates[index]))
    }

    if (action === "approve") {
      if (current.status !== "DRAFT") return route.fulfill(apiError(409, "CONTRACT_TEMPLATE_NOT_DRAFT"))
      if (!String(body.legalApprovalRef ?? "").trim()) return route.fulfill(apiError(422, "LEGAL_APPROVAL_REQUIRED"))
      templates.forEach((item, position) => {
        if (item.status === "APPROVED") templates[position] = { ...item, status: "RETIRED" }
      })
      // A newer approved model leaves every contract generated before it outdated.
      contracts.forEach((contract) => (contract.outdated = true))
      return bump({ approvedAt: new Date().toISOString(), legalApprovalRef: body.legalApprovalRef, status: "APPROVED" })
    }
    if (action === "retire") {
      if (current.status !== "APPROVED") return route.fulfill(apiError(409, "CONTRACT_TEMPLATE_NOT_APPROVED"))
      return bump({ status: "RETIRED" })
    }
    if (current.status !== "DRAFT") return route.fulfill(apiError(409, "CONTRACT_TEMPLATE_NOT_DRAFT"))
    if (unknownField(String(body.body))) return route.fulfill(apiError(422, "CONTRACT_FIELD_UNKNOWN"))
    return bump({ body: body.body, title: body.title })
  })

  // The contract of an enrollment and the requests of acceptance (registered last, so they answer before
  // the enrollment's own route).
  await page.route(/\/api\/enrollments\/\d+\/contract(\/.*)?$/, (route) => {
    const call = record(route.request())
    const enrollmentId = Number(/\/api\/enrollments\/(\d+)\//.exec(call.path)?.[1])
    const rest = call.path.replace(/^\/api\/enrollments\/\d+\/contract\/?/, "")
    const current = records.get(enrollmentId) as Item
    const contract = contracts.get(enrollmentId)
    const signerIds = (current.parties as Item[])
      .filter((party) => party.signatory && party.linkActive)
      .map((party) => party.guardianId as number)
    const withMissing = (item: Item) => {
      const accepted = (item.acceptances as Item[]).filter((entry) => entry.status === "ACCEPTED")
      return {
        ...item,
        missingSigners: signerIds.filter((id) => !accepted.some((entry) => entry.signerId === id)),
      }
    }
    const bumpEnrollment = () => records.set(enrollmentId, { ...current, version: Number(current.version) + 1 })

    if (!rest && call.method === "GET") {
      if (!contract) return route.fulfill(apiError(404, "CONTRACT_NOT_FOUND"))
      return route.fulfill(apiAnswer(withMissing(contract)))
    }

    if (!rest && call.method === "POST") {
      const approved = templates.find((item) => item.status === "APPROVED")
      if (!approved) return route.fulfill(apiError(409, "CONTRACT_TEMPLATE_NOT_APPROVED"))
      if (!current.classContext || !current.startDate || signerIds.length === 0) {
        return route.fulfill(apiError(422, "CONTRACT_NOT_READY"))
      }
      const generated = {
        acceptances: [],
        body: String(approved.body).replace("{{student.name}}", String((current.student as Item).name)),
        contentHash: "a1b2c3d4e5f6a7b8c9d0e1f2",
        enrollmentId,
        generatedAt: new Date().toISOString(),
        id: nextContractId++,
        missingSigners: [],
        outdated: false,
        templateVersion: approved.versionNumber,
        title: approved.title,
      }
      contracts.set(enrollmentId, generated)
      bumpEnrollment()
      return route.fulfill(apiAnswer(withMissing(generated)))
    }

    if (!contract) return route.fulfill(apiError(409, "CONTRACT_NOT_GENERATED"))
    const acceptances = contract.acceptances as Item[]

    if (rest === "acceptances") {
      if (contract.outdated) return route.fulfill(apiError(409, "CONTRACT_OUTDATED"))
      const body = (call.body ?? {}) as { signerId?: number }
      if (body.signerId !== undefined && !signerIds.includes(body.signerId)) {
        return route.fulfill(apiError(422, "SIGNER_INVALID"))
      }
      const asked = body.signerId === undefined ? signerIds : [body.signerId]
      asked.forEach((signerId) => {
        if (acceptances.some((entry) => entry.signerId === signerId && entry.status === "ACCEPTED")) return
        acceptances.forEach((entry) => {
          if (entry.signerId === signerId && entry.status === "PENDING") entry.status = "SUPERSEDED"
        })
        const party = (current.parties as Item[]).find((item) => item.guardianId === signerId)
        acceptances.push({
          acceptedAt: null,
          acceptedContractHash: null,
          acceptedIp: null,
          email: "fernanda@exemplo.com",
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          id: nextAcceptanceId++,
          requestedAt: new Date().toISOString(),
          // A new enrollment asks only who contracts; the payer accepts only on a transfer or a re-enrollment.
          roles: "CONTRACTING",
          sendResult: "SENT",
          signerId,
          signerName: party?.guardianName ?? null,
          status: "PENDING",
          version: 0,
        })
      })
      return route.fulfill(apiAnswer(withMissing(contract)))
    }

    const revoke = /^acceptances\/(\d+)\/revoke$/.exec(rest)
    if (revoke) {
      const entry = acceptances.find((item) => item.id === Number(revoke[1]))
      if (!entry) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))
      if (entry.status !== "PENDING") return route.fulfill(apiError(409, "ACCEPTANCE_NOT_PENDING"))
      entry.status = "REVOKED"
      return route.fulfill(apiAnswer(withMissing(contract)))
    }

    return route.fallback()
  })

  // The lifecycle events (EPIC 7, foundation): prepared, read, given up and recovered by intent, never
  // confirmed. A transfer or a re-enrollment opens its destination preparation, kept with the enrollments.
  const lifecycle = new Map<number, Item>()
  let nextLifecycleId = 41
  // The capacity exception (Fatia C): the units that published it, and each event's one authorization.
  const capacityPolicies = new Map<number, Item>(
    (options.capacityEnabledUnits ?? []).map((unitId) => [
      unitId,
      { enabled: true, publishedAt: "2026-11-26T12:00:00Z", unitId, version: 0 },
    ]),
  )
  const capacityAuthorizations = new Map<number, Item>()
  // What comes after a confirmation (the diary and the notifications), the corrections and the policies.
  const outbox = new Map<number, Item[]>()
  const rectifications = new Map<number, Item[]>()
  let nextOutboxId = 800
  const lockPolicies: Item[] = Object.entries(options.lockPolicyUnits ?? {}).map(([unitId, maxDays], index) => ({
    active: true,
    id: 60 + index,
    maxDays,
    note: null,
    publishedAt: "2026-11-27T12:00:00Z",
    stageId: 2,
    unitId: Number(unitId),
    version: 0,
  }))
  const noEffectRules: Item[] = (options.noEffectUnits ?? []).flatMap((unitId, index) =>
    ["TRANSFER", "REENROLLMENT", "CANCELLATION", "LOCK"].map((eventType, typeIndex) => ({
      active: true,
      eventType,
      evidence: "Oferta sem cobrança (homologação)",
      id: 200 + index * 10 + typeIndex,
      offerId: null,
      publishedAt: "2026-11-27T12:00:00Z",
      ruleRef: "Ata 1/2026",
      unitId,
      version: 0,
    })),
  )
  let nextPolicyRowId = 300
  const templatesByType = new Map<string, Item>(
    ["TRANSFER", "REENROLLMENT", "CANCELLATION", "LOCK", "LOCK_RETURN"].map((eventType) => [
      eventType,
      {
        body: `Olá. A matrícula de {{student.name}} mudou em {{event.date}}.`,
        eventType,
        published: Boolean(options.publishedTexts),
        publishedAt: options.publishedTexts ? "2026-11-27T12:00:00Z" : null,
        subject: `Aviso da escola (${eventType})`,
        updatedAt: null,
        version: 0,
      },
    ]),
  )
  let nextNumber = 77

  const queueAfterCommit = (event: Item, kind: string) => {
    const items = outbox.get(Number(event.id)) ?? []
    const now = new Date().toISOString()
    if (kind === "CONFIRMATION") {
      items.push({
        appliedAt: null,
        attempts: 0,
        consumer: "DIARY",
        id: nextOutboxId++,
        kind,
        lastAttemptAt: null,
        lastErrorCode: null,
        recipientEmail: null,
        recipientId: null,
        status: "PENDING",
      })
    }
    items.push(
      {
        appliedAt: now,
        attempts: 1,
        consumer: "NOTIFICATION",
        id: nextOutboxId++,
        kind,
        lastAttemptAt: now,
        lastErrorCode: null,
        recipientEmail: "f*****@exemplo.com",
        recipientId: 301,
        status: "APPLIED",
      },
      {
        appliedAt: null,
        attempts: 1,
        consumer: "NOTIFICATION",
        id: nextOutboxId++,
        kind,
        // Long ago, so it may be sent again.
        lastAttemptAt: "2026-11-27T08:00:00Z",
        lastErrorCode: "EMAIL_MISSING",
        recipientEmail: null,
        recipientId: 302,
        status: "FAILED",
      },
    )
    outbox.set(Number(event.id), items)
  }

  const confirmEvent = (current: Item, intent: string) => {
    const now = new Date().toISOString()
    const type = String(current.eventType)
    const origin = records.get(Number(current.originEnrollmentId)) as Item
    const before = String(origin.status)
    const originStatus: Record<string, string> = { CANCELLATION: "CANCELLED", LOCK: "LOCKED", TRANSFER: "TRANSFERRED" }
    if (originStatus[type]) {
      records.set(Number(origin.id), {
        ...origin,
        status: originStatus[type],
        updatedAt: now,
        version: Number(origin.version) + 1,
      })
      addEvent(Number(origin.id), {
        action: "STATUS_CHANGED",
        afterValue: originStatus[type],
        beforeValue: before,
        category: "STATUS",
        changedFields: "status",
        reason: current.reasonCode,
      })
    }
    let destinationStartDate: string | null = null
    if (current.destinationEnrollmentId) {
      const destination = records.get(Number(current.destinationEnrollmentId)) as Item
      destinationStartDate = (destination.startDate as string | null) ?? null
      records.set(Number(destination.id), {
        ...destination,
        confirmedAt: now,
        enrollmentNumber: `2027-0000${nextNumber++}`,
        status: "ACTIVE",
        updatedAt: now,
        version: Number(destination.version) + 1,
      })
      addEvent(Number(destination.id), {
        action: `CONFIRMED_${type}`,
        afterValue: String(current.id),
        category: "LIFECYCLE",
        changedFields: "lifecycleEvent",
        reason: current.reasonCode,
      })
    }
    addEvent(Number(origin.id), {
      action: `CONFIRMED_${type}`,
      afterValue: String(current.id),
      category: "LIFECYCLE",
      changedFields: "lifecycleEvent",
      reason: current.reasonCode,
    })
    const confirmed = {
      ...current,
      confirmationIntent: intent,
      confirmedAt: now,
      confirmedBy: 1,
      consequences: (current.consequences as Item[]).map((item) =>
        item.mandatory ? { ...item, attempts: 1, status: "APPLIED" } : item,
      ),
      destinationStartDate,
      status: "CONFIRMED",
      version: Number(current.version) + 1,
    }
    lifecycle.set(Number(current.id), confirmed)
    queueAfterCommit(confirmed, "CONFIRMATION")
    return confirmed
  }

  const returnLock = (current: Item, intent: string, body: Item) => {
    const now = new Date().toISOString()
    const origin = records.get(Number(current.originEnrollmentId)) as Item
    records.set(Number(origin.id), { ...origin, status: "ACTIVE", updatedAt: now, version: Number(origin.version) + 1 })
    addEvent(Number(origin.id), {
      action: "LOCK_RETURNED",
      afterValue: "ACTIVE",
      beforeValue: "LOCKED",
      category: "STATUS",
      changedFields: "status",
      reason: current.reasonCode,
    })
    const returned = {
      ...current,
      returnAttendanceRef: body.attendanceRef,
      returnedAt: now,
      returnIntent: intent,
      returnRequestedOn: body.requestedOn,
      version: Number(current.version) + 1,
    }
    lifecycle.set(Number(current.id), returned)
    queueAfterCommit(returned, "LOCK_RETURN")
    return returned
  }
  let losePending = Boolean(options.losePrepareAnswer)

  const isEligibleOrigin = (origin: Item, type: string) =>
    origin.status === "ACTIVE" || (type === "REENROLLMENT" && origin.status === "COMPLETED")

  const blockersOf = (event: Item) => {
    const codes: string[] = []
    const type = String(event.eventType)
    if (!isEligibleOrigin(records.get(event.originEnrollmentId as number) as Item, type)) {
      codes.push("ORIGIN_NOT_ELIGIBLE")
    }
    if (event.destinationEnrollmentId) {
      const destination = records.get(event.destinationEnrollmentId as number) as Item
      if (destination.status === "ABANDONED") codes.push("DESTINATION_ABANDONED")
      else if (!destination.classContext) codes.push("DESTINATION_CLASS_MISSING")
      // A full destination class: an available authorization lifts it.
      const authorization = capacityAuthorizations.get(Number(event.id))
      if (options.destinationFull && authorization?.status !== "AVAILABLE") codes.push("DESTINATION_FULL")
      if (authorization?.status === "EXPIRED") codes.push("CAPACITY_EXCEPTION_EXPIRED")
    }
    if ((type === "TRANSFER" || type === "REENROLLMENT") && !templates.some((item) => item.status === "APPROVED")) {
      codes.push("CONTRACT_MODEL_NOT_APPROVED")
    }
    if (type === "LOCK") {
      const limit = lockPolicies.find((item) => item.active && item.unitId === event.originUnitId)
      if (!limit) codes.push("LOCK_POLICY_UNDEFINED")
      else if (Number(event.lockDays) > Number(limit.maxDays)) codes.push("LOCK_DAYS_ABOVE_POLICY")
    }
    const financialUnit = event.destinationUnitId ?? event.originUnitId
    const released = noEffectRules.some(
      (item) => item.active && item.unitId === financialUnit && item.eventType === type,
    )
    if (!released) codes.push("FINANCIAL_POLICY_PENDING")
    // A cancellation is confirmed on its effective day; a future one waits for it.
    if (type === "CANCELLATION" && event.effectiveDate) {
      if (String(event.effectiveDate) > today()) codes.push("EFFECTIVE_DATE_NOT_REACHED")
      else if (String(event.effectiveDate) < today()) codes.push("EFFECTIVE_DATE_PASSED")
    }
    if (!templatesByType.get(type)?.published) codes.push("NOTIFICATION_TEXT_NOT_PUBLISHED")
    return codes.map((code) => ({ code, message: `${code} (backend text)` }))
  }

  const lifecycleView = (event: Item): Item => {
    const prepared = event.status === "PREPARED"
    let effectiveDateOnConfirmation: string | null = null
    if (event.eventType === "CANCELLATION") {
      effectiveDateOnConfirmation = (event.effectiveDate as string | null) ?? (prepared ? today() : null)
    }
    const blockers = prepared ? blockersOf(event) : []
    let eligibleActions: string[] = []
    if (prepared && !options.readOnly) eligibleActions = ["ABANDON", "CONFIRM"]
    const returnable = event.status === "CONFIRMED" && event.eventType === "LOCK" && !event.returnedAt
    if (returnable && !options.readOnly) eligibleActions = ["RETURN"]
    return {
      ...event,
      blockers,
      confirmationAvailable: prepared && blockers.length === 0,
      effectiveDateOnConfirmation,
      eligibleActions,
    }
  }

  const prepareEvent = (body: Item, origin: Item, content: string) => {
    const type = String(body.eventType)
    let destinationUnitId: number | null = null
    if (type === "TRANSFER") destinationUnitId = Number(body.destinationUnitId)
    if (type === "REENROLLMENT") destinationUnitId = Number(body.destinationUnitId ?? origin.unitId)

    const now = new Date().toISOString()
    let destinationEnrollmentId: number | null = null
    if (destinationUnitId !== null) {
      destinationEnrollmentId = nextId++
      records.set(
        destinationEnrollmentId,
        enrollment({
          createdAt: now,
          id: destinationEnrollmentId,
          kind: type,
          status: "DRAFT",
          student: studentRef(Number((origin.student as Item).id)),
          unitId: destinationUnitId,
          unitName: unitName(destinationUnitId),
          updatedAt: now,
        }),
      )
      addEvent(destinationEnrollmentId, { action: "PREPARATION_STARTED", category: "PREPARATION" })
    }

    const consumers: [string, boolean][] = [
      ["SEAT", true],
      ["FINANCIAL", true],
    ]
    if (destinationUnitId !== null) consumers.push(["CONTRACT", true])
    consumers.push(["DIARY", false], ["NOTIFICATION", false])

    const id = nextLifecycleId++
    const created: Item = {
      abandonedAt: null,
      abandonedBy: null,
      abandonReason: null,
      confirmedAt: null,
      consequences: consumers.map(([consumer, mandatory]) => ({
        attempts: 0,
        consumer,
        lastErrorCode: null,
        mandatory,
        status: "PENDING",
      })),
      content,
      destinationEnrollmentId,
      destinationUnitId,
      eventType: type,
      id,
      intent: body.intent,
      confirmedBy: null,
      destinationStartDate: null,
      effectiveDate: body.effectiveDate ?? null,
      justification: body.justification ?? null,
      lockDays: body.lockDays ?? null,
      originEnrollmentId: origin.id,
      originUnitId: origin.unitId,
      preparedAt: now,
      preparedBy: 1,
      reasonCatalogVersion: 1,
      reasonCode: body.reasonCode,
      returnAttendanceRef: null,
      returnedAt: null,
      returnRequestedOn: null,
      status: "PREPARED",
      studentId: (origin.student as Item).id,
      version: 0,
    }
    lifecycle.set(id, created)
    addEvent(Number(origin.id), {
      action: `PREPARED_${type}`,
      afterValue: String(id),
      category: "LIFECYCLE",
      changedFields: "lifecycleEvent",
      reason: body.reasonCode,
    })
    return created
  }

  const abandonEvent = (current: Item, reason: string) => {
    const now = new Date().toISOString()
    const destination = current.destinationEnrollmentId
      ? records.get(current.destinationEnrollmentId as number)
      : undefined
    if (destination && preparation.includes(String(destination.status))) {
      records.set(destination.id as number, {
        ...destination,
        abandonReason: `Lifecycle event ${current.id} given up`,
        status: "ABANDONED",
        updatedAt: now,
        version: Number(destination.version) + 1,
      })
    }
    const changed = {
      ...current,
      abandonedAt: now,
      abandonedBy: 1,
      abandonReason: reason,
      status: "ABANDONED",
      version: Number(current.version) + 1,
    }
    lifecycle.set(current.id as number, changed)
    addEvent(Number(current.originEnrollmentId), {
      action: `ABANDONED_${String(current.eventType)}`,
      afterValue: String(current.id),
      category: "LIFECYCLE",
      changedFields: "lifecycleEvent",
      reason: current.reasonCode,
    })
    return changed
  }

  await page.route(/\/api\/lifecycle-events(\/.*)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const rest = call.path.replace(/^\/api\/lifecycle-events\/?/, "")

    if (rest === "reasons") {
      return route.fulfill(apiAnswer(lifecycleReasons.filter((item) => item.eventType === call.query.type)))
    }

    if (rest === "capacity-policy") {
      if (call.method === "GET") {
        const unitId = Number(call.query.unitId)
        return route.fulfill(
          apiAnswer(capacityPolicies.get(unitId) ?? { enabled: false, publishedAt: null, unitId, version: null }),
        )
      }
      if (options.readOnly) return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
      const body = call.body as Item
      const unitId = Number(body.unitId)
      const current = capacityPolicies.get(unitId)
      if (current && body.version === undefined) return route.fulfill(apiError(428, "VERSION_REQUIRED"))
      if (current && body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const published = {
        enabled: Boolean(body.enabled),
        publishedAt: new Date().toISOString(),
        unitId,
        version: current ? Number(current.version) + 1 : 0,
      }
      capacityPolicies.set(unitId, published)
      return route.fulfill(apiAnswer(published))
    }

    if (!rest && call.method === "GET") {
      const { status, studentId, type } = call.query
      const found = [...lifecycle.values()]
        .filter((item) => !status || item.status === status)
        .filter((item) => !type || item.eventType === type)
        .filter((item) => !studentId || String(item.studentId) === studentId)
        .map(lifecycleView)
      return route.fulfill(apiAnswer(toPage(found, call.query)))
    }

    if (!rest && call.method === "POST") {
      if (options.readOnly) return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
      const body = call.body as Item
      const type = String(body.eventType)
      const content = JSON.stringify([
        type,
        body.originEnrollmentId,
        body.reasonCode,
        body.justification ?? "",
        body.destinationUnitId ?? null,
        body.lockDays ?? null,
        body.effectiveDate ?? null,
      ])
      const same = [...lifecycle.values()].find((item) => item.intent === body.intent)
      if (same && same.content !== content) return route.fulfill(apiError(409, "LIFECYCLE_INTENT_REUSED"))
      if (same) return route.fulfill({ ...apiAnswer(lifecycleView(same)), status: 201 })

      const origin = records.get(Number(body.originEnrollmentId))
      if (!origin) return route.fulfill(apiError(404, "ENROLLMENT_NOT_FOUND"))
      if (!isEligibleOrigin(origin, type)) return route.fulfill(apiError(422, "LIFECYCLE_ORIGIN_NOT_ELIGIBLE"))
      const reason = lifecycleReasons.find((item) => item.eventType === type && item.code === body.reasonCode)
      if (!reason || (reason.requiresJustification && !String(body.justification ?? "").trim())) {
        return route.fulfill(apiError(422, "LIFECYCLE_REASON_INVALID"))
      }
      if (type === "TRANSFER" && (!body.destinationUnitId || body.destinationUnitId === origin.unitId)) {
        return route.fulfill(apiError(422, "LIFECYCLE_DESTINATION_INVALID"))
      }
      const open = [...lifecycle.values()].some(
        (item) => item.originEnrollmentId === origin.id && item.status === "PREPARED",
      )
      if (open) return route.fulfill(apiError(409, "LIFECYCLE_EVENT_OPEN"))

      const created = prepareEvent(body, origin, content)
      if (losePending) {
        losePending = false
        return route.abort("connectionreset")
      }
      return route.fulfill({ ...apiAnswer(lifecycleView(created)), status: 201 })
    }

    const byIntent = /^by-intent\/(.+)$/.exec(rest)
    if (byIntent) {
      const found = [...lifecycle.values()].find((item) => item.intent === decodeURIComponent(byIntent[1]))
      if (!found) return route.fulfill(apiError(404, "LIFECYCLE_EVENT_NOT_FOUND"))
      return route.fulfill(apiAnswer(lifecycleView(found)))
    }

    const resend = /^(\d+)\/outbox\/(\d+)\/resend$/.exec(rest)
    if (resend) {
      const items = outbox.get(Number(resend[1])) ?? []
      const index = items.findIndex((item) => item.id === Number(resend[2]))
      if (index < 0) return route.fulfill(apiError(404, "OUTBOX_ITEM_NOT_FOUND"))
      const item = items[index]
      if (Number(item.attempts) >= 3) return route.fulfill(apiError(409, "NOTIFICATION_RESEND_LIMIT"))
      const now = new Date().toISOString()
      items[index] = { ...item, attempts: Number(item.attempts) + 1, lastAttemptAt: now }
      return route.fulfill(apiAnswer(items[index]))
    }

    const [, id, action] = /^(\d+)(?:\/([a-z-]+))?$/.exec(rest) ?? []
    const current = lifecycle.get(Number(id))
    if (!current) return route.fulfill(apiError(404, "LIFECYCLE_EVENT_NOT_FOUND"))

    if (!action && call.method === "GET") return route.fulfill(apiAnswer(lifecycleView(current)))

    if (action === "abandon") {
      const body = call.body as Item
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (current.status !== "PREPARED") return route.fulfill(apiError(409, "LIFECYCLE_EVENT_NOT_PREPARED"))
      return route.fulfill(apiAnswer(lifecycleView(abandonEvent(current, String(body.reason)))))
    }

    if (action === "confirm") {
      const body = call.body as Item
      if (options.readOnly) return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
      if (current.status === "CONFIRMED") {
        if (current.confirmationIntent === body.intent) return route.fulfill(apiAnswer(lifecycleView(current)))
        return route.fulfill(apiError(409, "LIFECYCLE_EVENT_NOT_PREPARED"))
      }
      if (current.status !== "PREPARED") return route.fulfill(apiError(409, "LIFECYCLE_EVENT_NOT_PREPARED"))
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (blockersOf(current).length > 0) return route.fulfill(apiError(422, "LIFECYCLE_CONFIRMATION_BLOCKED"))
      return route.fulfill(apiAnswer(lifecycleView(confirmEvent(current, String(body.intent)))))
    }

    if (action === "return") {
      const body = call.body as Item
      if (current.eventType !== "LOCK" || current.status !== "CONFIRMED" || current.returnedAt) {
        if (current.returnIntent === body.intent) return route.fulfill(apiAnswer(lifecycleView(current)))
        return route.fulfill(apiError(409, "LIFECYCLE_LOCK_NOT_RETURNABLE"))
      }
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const requestedOn = String(body.requestedOn ?? "")
      if (!requestedOn || requestedOn > today() || !String(body.attendanceRef ?? "").trim()) {
        return route.fulfill(apiError(400, "INVALID_REQUEST"))
      }
      if (!templatesByType.get("LOCK_RETURN")?.published) {
        return route.fulfill(apiError(422, "LIFECYCLE_CONFIRMATION_BLOCKED"))
      }
      return route.fulfill(apiAnswer(lifecycleView(returnLock(current, String(body.intent), body))))
    }

    if (action === "outbox" && call.method === "GET") {
      if (options.readOnly) return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
      return route.fulfill(apiAnswer(outbox.get(Number(id)) ?? []))
    }

    if (action === "reprocess") {
      const reason = String((call.body as Item)?.reason ?? "").trim()
      if (reason.length < 3 || reason.length > 300) return route.fulfill(apiError(400, "INVALID_REQUEST"))
      // Only what failed is applied again.
      const items = (outbox.get(Number(id)) ?? []).map((item) =>
        item.status !== "FAILED"
          ? item
          : {
              ...item,
              appliedAt: new Date().toISOString(),
              attempts: Number(item.attempts) + 1,
              lastErrorCode: null,
              status: "APPLIED",
            },
      )
      outbox.set(Number(id), items)
      return route.fulfill(apiAnswer(items))
    }

    if (action === "rectify") {
      const body = call.body as Item
      const list = rectifications.get(Number(id)) ?? []
      const oldValue = body.field === "REASON" ? current.reasonCode : current.justification
      const item = {
        field: body.field,
        id: 900 + list.length,
        newValue: body.newValue,
        oldValue: oldValue ?? null,
        reason: body.reason,
        rectifiedAt: new Date().toISOString(),
        rectifiedBy: 1,
      }
      rectifications.set(Number(id), [...list, item])
      addEvent(Number(current.originEnrollmentId), {
        action: `RECTIFIED_${String(body.field)}`,
        afterValue: String(current.id),
        category: "LIFECYCLE",
        changedFields: "lifecycleEvent",
        reason: body.field === "REASON" ? body.newValue : current.reasonCode,
      })
      return route.fulfill({ ...apiAnswer(item), status: 201 })
    }

    if (action === "rectifications") return route.fulfill(apiAnswer(rectifications.get(Number(id)) ?? []))

    if (action === "evidence") {
      return route.fulfill(
        apiAnswer({
          event: lifecycleView(current),
          exportedAt: new Date().toISOString(),
          outbox: outbox.get(Number(id)) ?? [],
          rectifications: rectifications.get(Number(id)) ?? [],
        }),
      )
    }

    if (action === "capacity-exception") {
      const authorization = capacityAuthorizations.get(Number(id))
      if (call.method === "GET") {
        if (!authorization) return route.fulfill(apiError(404, "CAPACITY_EXCEPTION_NOT_FOUND"))
        return route.fulfill(apiAnswer(authorization))
      }
      if (options.readOnly) return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
      if (current.status !== "PREPARED") return route.fulfill(apiError(409, "LIFECYCLE_EVENT_NOT_PREPARED"))
      if (!current.destinationUnitId) return route.fulfill(apiError(422, "CAPACITY_EXCEPTION_NOT_APPLICABLE"))
      if (!capacityPolicies.get(Number(current.destinationUnitId))?.enabled) {
        return route.fulfill(apiError(409, "CAPACITY_EXCEPTION_NOT_PUBLISHED"))
      }
      if (!options.destinationFull) return route.fulfill(apiError(422, "CAPACITY_EXCEPTION_NOT_NEEDED"))
      if (authorization) return route.fulfill(apiError(409, "CAPACITY_EXCEPTION_EXISTS"))
      const now = Date.now()
      const created = {
        authorizedAt: new Date(now).toISOString(),
        authorizedBy: 1,
        classId: 0,
        eventId: current.id,
        expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        id: 90,
        reason: (call.body as Item).reason,
        status: "AVAILABLE",
      }
      capacityAuthorizations.set(Number(id), created)
      return route.fulfill({ ...apiAnswer(created), status: 201 })
    }

    return route.fallback()
  })

  // The policies the lifecycle events read (Fatia H): the lock's maximum, the "no financial effect" rule and
  // the notifications' text. Only the Admin writes.
  const publishRow = (rows: Item[], matches: (item: Item) => boolean, body: Item, fields: Item) => {
    const index = rows.findIndex(matches)
    const now = new Date().toISOString()
    if (index < 0) {
      const created = { active: true, id: nextPolicyRowId++, publishedAt: now, version: 0, ...fields }
      rows.push(created)
      return { row: created }
    }
    const current = rows[index]
    if (body.version === undefined) return { error: apiError(428, "VERSION_REQUIRED") }
    if (body.version !== current.version) return { error: apiError(409, "VERSION_CONFLICT") }
    rows[index] = { ...current, ...fields, active: true, publishedAt: now, version: Number(current.version) + 1 }
    return { row: rows[index] }
  }

  await page.route(/\/api\/lifecycle-policies(\/.*)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const rest = call.path.replace(/^\/api\/lifecycle-policies\/?/, "")
    const body = (call.body ?? {}) as Item
    if (options.readOnly && call.method !== "GET") return route.fulfill(apiError(403, "ENROLLMENT_ACCESS_DENIED"))
    const byUnit = (rows: Item[]) =>
      rows.filter((item) => !call.query.unitId || String(item.unitId) === call.query.unitId)

    if (rest === "lock" && call.method === "GET") return route.fulfill(apiAnswer(byUnit(lockPolicies)))
    if (rest === "lock" && call.method === "PUT") {
      const result = publishRow(
        lockPolicies,
        (item) => item.unitId === body.unitId && item.stageId === body.stageId,
        body,
        { maxDays: body.maxDays, note: body.note ?? null, stageId: body.stageId, unitId: body.unitId },
      )
      return route.fulfill(result.error ?? apiAnswer(result.row))
    }
    if (rest === "financial-no-effect" && call.method === "GET") return route.fulfill(apiAnswer(byUnit(noEffectRules)))
    if (rest === "financial-no-effect" && call.method === "PUT") {
      if (!body.offerId && !options.unitWideRules) return route.fulfill(apiError(422, "OFFER_REQUIRED"))
      const result = publishRow(
        noEffectRules,
        (item) =>
          item.unitId === body.unitId && item.eventType === body.eventType && item.offerId === (body.offerId ?? null),
        body,
        {
          eventType: body.eventType,
          evidence: body.evidence,
          offerId: body.offerId ?? null,
          ruleRef: body.ruleRef,
          unitId: body.unitId,
        },
      )
      return route.fulfill(result.error ?? apiAnswer(result.row))
    }
    const withdraw = /^(lock|financial-no-effect)\/(\d+)\/withdraw$/.exec(rest)
    if (withdraw) {
      const rows = withdraw[1] === "lock" ? lockPolicies : noEffectRules
      const index = rows.findIndex((item) => item.id === Number(withdraw[2]))
      if (index < 0) return route.fulfill(apiError(404, "LOCK_POLICY_NOT_FOUND"))
      if (body.version !== rows[index].version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      rows[index] = { ...rows[index], active: false, version: Number(rows[index].version) + 1 }
      return route.fulfill(apiAnswer(rows[index]))
    }
    if (rest === "notification-templates") return route.fulfill(apiAnswer([...templatesByType.values()]))
    const publishText = /^notification-templates\/([A-Z_]+)\/publish$/.exec(rest)
    if (publishText && call.method === "POST") {
      const current = templatesByType.get(publishText[1])
      if (!current) return route.fulfill(apiError(404, "TEMPLATE_NOT_FOUND"))
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      const published = {
        ...current,
        published: true,
        publishedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      templatesByType.set(publishText[1], published)
      return route.fulfill(apiAnswer(published))
    }
    const template = /^notification-templates\/([A-Z_]+)$/.exec(rest)
    if (template && call.method === "PUT") {
      const current = templatesByType.get(template[1])
      if (!current) return route.fulfill(apiError(404, "TEMPLATE_NOT_FOUND"))
      if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
      if (
        /\{\{(?!student\.name|institution\.name|unit\.name|event\.date|enrollment\.number)[^}]*\}\}/.test(
          String(body.body),
        )
      ) {
        return route.fulfill(apiError(400, "INVALID_REQUEST"))
      }
      // Editing a text makes it a draft again.
      const saved = {
        ...current,
        body: body.body,
        published: false,
        publishedAt: null,
        subject: body.subject,
        updatedAt: new Date().toISOString(),
        version: Number(current.version) + 1,
      }
      templatesByType.set(template[1], saved)
      return route.fulfill(apiAnswer(saved))
    }
    return route.fallback()
  })

  // The grades and periods that name an offer, and the offers of a unit, for the scope of a "no financial
  // effect" rule.
  const pageOf = (items: Item[]) => ({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 })
  await page.route(/\/api\/academic\/grades(\?.*)?$/, (route) =>
    route.fulfill(
      apiAnswer(
        pageOf([
          { eligibleActions: [], id: 11, name: "1º ano", sortOrder: 1, stageId: 2, status: "ACTIVE", version: 0 },
        ]),
      ),
    ),
  )
  await page.route(/\/api\/academic\/periods(\?.*)?$/, (route) =>
    route.fulfill(apiAnswer(pageOf([{ id: 5, name: "Ano letivo 2027", status: "ACTIVE" }]))),
  )
  await page.route(/\/api\/academic\/offers(\?.*)?$/, (route) => {
    const items = [
      {
        eligibleActions: [],
        gradeId: 11,
        id: 31,
        periodId: 5,
        status: "ACTIVE",
        subjectIds: [],
        unitId: 2,
        version: 0,
      },
    ]
    return route.fulfill(apiAnswer({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 }))
  })

  return {
    calls,
    capacityPolicies,
    catalog,
    contracts,
    exceptions,
    lifecycle,
    lockPolicies,
    noEffectRules,
    outbox,
    policies,
    records,
    templates,
  }
}
