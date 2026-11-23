import type { AcademicPeriod, AcademicPeriodKind, AcademicPeriodWrite } from "@/models"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

// The backend's limits for a period (P04, PT-DADOS-01): a name of 1 to 150 characters, a reason of 1 to
// 500, and a four-digit reference year.
export const periodLimits = {
  name: 150,
  reason: 500,
}

export const periodKinds: AcademicPeriodKind[] = ["ANNUAL", "SEMESTER", "OTHER"]

// A period as its form keeps it.
export type PeriodFormValues = {
  endDate: Date | null
  kind: "" | AcademicPeriodKind
  name: string
  referenceYear: string
  startDate: Date | null
  unitIds: number[]
}

export type PeriodFormField = keyof PeriodFormValues

export type PeriodFormErrors = Partial<Record<PeriodFormField, string>>

export const emptyPeriod = (): PeriodFormValues => ({
  endDate: null,
  kind: "",
  name: "",
  referenceYear: String(new Date().getFullYear()),
  startDate: null,
  unitIds: [],
})

export const toPeriodFormValues = (period: AcademicPeriod): PeriodFormValues => ({
  endDate: fromIsoDate(period.endDate),
  kind: period.kind,
  name: period.name,
  referenceYear: String(period.referenceYear),
  startDate: fromIsoDate(period.startDate),
  unitIds: [...period.unitIds],
})

// The body of a create or an edition (with the version read last).
export const toPeriodWrite = (values: PeriodFormValues, version?: number): AcademicPeriodWrite => ({
  endDate: values.endDate ? toIsoDate(values.endDate) : "",
  kind: values.kind as AcademicPeriodKind,
  name: values.name.trim(),
  referenceYear: Number(values.referenceYear),
  startDate: values.startDate ? toIsoDate(values.startDate) : "",
  unitIds: values.unitIds,
  version,
})

// Whether two forms hold the same period (the dates by day), for the unsaved-changes warning.
export const isSamePeriod = (first: PeriodFormValues, second: PeriodFormValues) =>
  first.name === second.name &&
  first.referenceYear === second.referenceYear &&
  first.kind === second.kind &&
  (first.startDate ? toIsoDate(first.startDate) : "") === (second.startDate ? toIsoDate(second.startDate) : "") &&
  (first.endDate ? toIsoDate(first.endDate) : "") === (second.endDate ? toIsoDate(second.endDate) : "") &&
  [...first.unitIds].sort().join(",") === [...second.unitIds].sort().join(",")
