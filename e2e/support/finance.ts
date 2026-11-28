import type { Request } from "@playwright/test"

import { apiAnswer, type Page } from "./test.ts"
import { apiError, type RecordedCall } from "./userAccess.ts"

// A mocked backend for the financial ledger (EPIC 8, Fatia 1): Bruno Lima's obligation (enrollment 502,
// Unidade Caucaia) with three installments, the receipts of the unit and their allocations, kept like the
// backend keeps them, plus every call recorded for the specs to check what was sent. Used with
// mockEnrollmentApi, which answers the enrollments and the units.

type Item = Record<string, unknown>

export type FinanceOptions = {
  // Bruno's enrollment has no obligation yet: the titles list is empty and it may be regularized.
  noObligation?: boolean
  // The person only reads the titles (a Secretaria): no allocations come with a title, no command is taken.
  readOnly?: boolean
}

const shiftDay = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString("en-CA")
}

const title = (fields: Item): Item => ({
  allocatedCents: 0,
  amountCents: 50000,
  calculationMemory: "1500,00 / 3 = 500,00 por parcela",
  currency: "BRL",
  obligationId: 70,
  overdue: false,
  partyPersonId: 202,
  situation: "OPEN",
  studentId: 202,
  unitId: 2,
  version: 0,
  writtenOffCents: 0,
  ...fields,
})

export const mockFinanceLedgerApi = async (page: Page, options: FinanceOptions = {}) => {
  const calls: RecordedCall[] = []
  const record = (request: Request) => {
    const url = new URL(request.url())
    const call: RecordedCall = {
      body: request.postDataJSON() as unknown,
      headers: request.headers(),
      method: request.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    }
    calls.push(call)
    return call
  }

  const titles: Item[] = options.noObligation
    ? []
    : [
        title({
          allocatedCents: 50000,
          competence: shiftDay(-35).slice(0, 7),
          dueDate: shiftDay(-35),
          id: 701,
          installmentNo: 1,
          residualCents: 0,
          situation: "SATISFIED",
        }),
        title({
          competence: shiftDay(-5).slice(0, 7),
          dueDate: shiftDay(-5),
          id: 702,
          installmentNo: 2,
          overdue: true,
          residualCents: 50000,
        }),
        title({
          competence: shiftDay(25).slice(0, 7),
          dueDate: shiftDay(25),
          id: 703,
          installmentNo: 3,
          residualCents: 50000,
        }),
      ]
  const allocations: Item[] = options.noObligation
    ? []
    : [
        {
          amountCents: 50000,
          createdAt: "2026-10-20T12:00:00Z",
          id: 901,
          receiptId: 801,
          status: "APPLIED",
          titleId: 701,
        },
      ]
  const receipts: Item[] = [
    {
      evidenceNote: "Comprovante PIX 99",
      feeCents: 0,
      grossCents: 50000,
      id: 801,
      method: "PIX_MANUAL",
      occurredOn: shiftDay(-36),
      status: "CONFIRMED",
      unitId: 2,
    },
    {
      evidenceNote: "Transferência conferida no extrato",
      feeCents: 150,
      grossCents: 30000,
      id: 802,
      method: "BANK_TRANSFER",
      occurredOn: shiftDay(-2),
      status: "CONFIRMED",
      unitId: 2,
    },
    {
      evidenceNote: "Família mandou o comprovante",
      feeCents: 0,
      grossCents: 50000,
      id: 803,
      method: "CASH",
      occurredOn: shiftDay(-1),
      status: "PENDING",
      unitId: 2,
    },
  ]
  let obligation: Item | null = options.noObligation
    ? null
    : {
        basis: null,
        createdAt: "2026-10-01T12:00:00Z",
        currency: "BRL",
        enrollmentId: 502,
        id: 70,
        originRef: "ENROLLMENT:502:CONFIRMATION",
        partyPersonId: 202,
        status: "ACTIVE",
        studentId: 202,
        totalCents: 150000,
        unitId: 2,
      }
  let nextId = 1000

  const applied = (receiptId: number) =>
    allocations
      .filter((item) => item.receiptId === receiptId && item.status === "APPLIED")
      .reduce((total, item) => total + Number(item.amountCents), 0)

  const receiptView = (receipt: Item): Item => {
    const allocated = applied(Number(receipt.id))
    return {
      ...receipt,
      allocatedCents: allocated,
      allocations: allocations.filter((item) => item.receiptId === receipt.id),
      currency: "BRL",
      netCents: Number(receipt.grossCents) - Number(receipt.feeCents),
      payerPersonId: null,
      registeredAt: "2026-11-27T12:00:00Z",
      registeredBy: 1,
      source: "MANUAL",
      unallocatedCents: Number(receipt.grossCents) - allocated,
      validatedAt: null,
      validatedBy: null,
      version: 0,
    }
  }

  const obligationView = () => (obligation ? { ...obligation, titles } : null)

  const pageOf = (items: Item[], query: Record<string, string>) => {
    const size = Number(query.size ?? 20)
    const number = Number(query.page ?? 0)
    return {
      items: items.slice(number * size, number * size + size),
      page: number,
      size,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
    }
  }

  const refreshTitle = (item: Item) => {
    const allocated = allocations
      .filter((entry) => entry.titleId === item.id && entry.status === "APPLIED")
      .reduce((total, entry) => total + Number(entry.amountCents), 0)
    const residual = Number(item.amountCents) - allocated
    let situation = "OPEN"
    if (residual === 0) situation = "SATISFIED"
    else if (allocated > 0) situation = "PARTIAL"
    Object.assign(item, {
      allocatedCents: allocated,
      overdue: residual > 0 && String(item.dueDate) < shiftDay(0),
      residualCents: residual,
      situation,
      version: Number(item.version) + 1,
    })
  }

  await page.route(/\/api\/finance\/(titles|receipts|allocations|obligations)(\/.*)?(\?.*)?$/, (route) => {
    const call = record(route.request())
    const rest = call.path.replace(/^\/api\/finance\//, "")
    const body = (call.body ?? {}) as Item
    if (options.readOnly && call.method === "POST") return route.fulfill(apiError(403, "FINANCE_ACCESS_DENIED"))

    if (rest === "titles" && call.method === "GET") {
      const { overdue, situation, studentId, unitId } = call.query
      const found = titles
        .filter((item) => !unitId || String(item.unitId) === unitId)
        .filter((item) => !studentId || String(item.studentId) === studentId)
        .filter((item) => !situation || item.situation === situation)
        .filter((item) => overdue !== "true" || item.overdue)
      return route.fulfill(apiAnswer(pageOf(found, call.query)))
    }

    const titleMatch = /^titles\/(\d+)$/.exec(rest)
    if (titleMatch && call.method === "GET") {
      const found = titles.find((item) => item.id === Number(titleMatch[1]))
      if (!found) return route.fulfill(apiError(404, "FINANCE_OBJECT_NOT_FOUND"))
      return route.fulfill(
        apiAnswer({
          allocations: options.readOnly ? [] : allocations.filter((item) => item.titleId === found.id),
          obligation: obligationView(),
          title: found,
        }),
      )
    }

    if (rest === "receipts" && call.method === "GET") {
      const { status, unitId } = call.query
      const found = receipts
        .filter((item) => !unitId || String(item.unitId) === unitId)
        .filter((item) => !status || item.status === status)
        .map(receiptView)
      return route.fulfill(apiAnswer(pageOf(found, call.query)))
    }

    if (rest === "receipts" && call.method === "POST") {
      const created = {
        evidenceNote: body.evidenceNote,
        feeCents: body.feeCents ?? 0,
        grossCents: body.grossCents,
        id: nextId++,
        method: body.method,
        occurredOn: body.occurredOn,
        status: body.nature === "VALIDATED" ? "CONFIRMED" : "PENDING",
        unitId: body.unitId,
      }
      receipts.unshift(created)
      return route.fulfill({ ...apiAnswer(receiptView(created)), status: 201 })
    }

    const validate = /^receipts\/(\d+)\/validate$/.exec(rest)
    if (validate) {
      const found = receipts.find((item) => item.id === Number(validate[1]))
      if (!found) return route.fulfill(apiError(404, "FINANCE_OBJECT_NOT_FOUND"))
      if (found.status === "CONFIRMED") return route.fulfill(apiError(409, "FINANCE_RECEIPT_ALREADY_CONFIRMED"))
      found.status = "CONFIRMED"
      return route.fulfill(apiAnswer(receiptView(found)))
    }

    if (rest === "allocations" && call.method === "POST") {
      const receipt = receipts.find((item) => item.id === body.receiptId)
      const target = titles.find((item) => item.id === body.titleId)
      if (!receipt || !target) return route.fulfill(apiError(404, "FINANCE_OBJECT_NOT_FOUND"))
      if (target.version !== body.titleVersion) return route.fulfill(apiError(409, "FINANCE_TITLE_VERSION_STALE"))
      if (receipt.status !== "CONFIRMED") return route.fulfill(apiError(422, "FINANCE_RECEIPT_NOT_CONFIRMED"))
      const amount = Number(body.amountCents)
      if (amount > Number(receipt.grossCents) - applied(Number(receipt.id))) {
        return route.fulfill(apiError(422, "FINANCE_ALLOCATION_EXCEEDS_RECEIPT"))
      }
      if (amount > Number(target.residualCents)) return route.fulfill(apiError(422, "FINANCE_ALLOCATION_EXCEEDS_TITLE"))
      const created = {
        amountCents: amount,
        createdAt: new Date().toISOString(),
        id: nextId++,
        receiptId: receipt.id,
        status: "APPLIED",
        titleId: target.id,
      }
      allocations.push(created)
      refreshTitle(target)
      return route.fulfill({ ...apiAnswer(created), status: 201 })
    }

    const reverse = /^allocations\/(\d+)\/reverse$/.exec(rest)
    if (reverse) {
      const found = allocations.find((item) => item.id === Number(reverse[1]))
      if (!found) return route.fulfill(apiError(404, "FINANCE_OBJECT_NOT_FOUND"))
      if (found.status !== "APPLIED") return route.fulfill(apiError(409, "FINANCE_ALLOCATION_NOT_APPLIED"))
      Object.assign(found, {
        compensatedAt: new Date().toISOString(),
        compensationReason: body.reason,
        status: "COMPENSATED",
      })
      const target = titles.find((item) => item.id === found.titleId)
      if (target) refreshTitle(target)
      return route.fulfill(apiAnswer(found))
    }

    if (rest === "obligations/regularize") {
      if (obligation) return route.fulfill(apiError(409, "FINANCE_ORIGIN_ALREADY_REGISTERED"))
      const count = Number(body.installments)
      const total = Number(body.totalCents)
      const share = Math.floor(total / count)
      obligation = {
        basis: body.basis,
        createdAt: new Date().toISOString(),
        currency: "BRL",
        enrollmentId: body.enrollmentId,
        id: 71,
        originRef: `ENROLLMENT:${String(body.enrollmentId)}:REGULARIZATION`,
        partyPersonId: body.partyPersonId,
        status: "ACTIVE",
        studentId: 202,
        totalCents: total,
        unitId: 2,
      }
      for (let index = 0; index < count; index++) {
        const due = new Date(`${String(body.firstDueDate)}T12:00:00`)
        due.setMonth(due.getMonth() + index)
        const amount = index === count - 1 ? total - share * (count - 1) : share
        titles.push(
          title({
            amountCents: amount,
            competence: due.toLocaleDateString("en-CA").slice(0, 7),
            dueDate: due.toLocaleDateString("en-CA"),
            id: 710 + index,
            installmentNo: index + 1,
            obligationId: 71,
            partyPersonId: body.partyPersonId,
            residualCents: amount,
          }),
        )
      }
      return route.fulfill({ ...apiAnswer(obligationView()), status: 201 })
    }

    return route.fallback()
  })

  return { allocations, calls, receipts, titles }
}
