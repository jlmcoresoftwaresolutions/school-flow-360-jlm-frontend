import { useTranslation } from "react-i18next"

import type {
  AcademicCalendarCategory,
  AcademicCalendarVersionStatus,
  AcademicCatalogStatus,
  AcademicClassPendency,
  AcademicClassStatus,
  AcademicPeriodKind,
  AcademicPeriodStatus,
  AcademicShiftCode,
  AcademicTeacherLinkState,
} from "@/models"
import { formatDate } from "@/utils/dates"

import { readAcademicBlocker } from "./academicBlockers"
import type { AcademicUnits } from "./useAcademicUnits"

type Tone = "neutral" | "success" | "warning"

const catalogStatusTones: Record<AcademicCatalogStatus, Tone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
}

const classStatusTones: Record<AcademicClassStatus, Tone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  PREPARATION: "warning",
}

const calendarCategoryTones: Record<AcademicCalendarCategory, Tone> = {
  DIA_LETIVO: "success",
  EVENTO: "neutral",
  FERIADO: "warning",
}

const calendarVersionTones: Record<AcademicCalendarVersionStatus, Tone> = {
  PUBLISHED: "success",
  SUPERSEDED: "neutral",
  WITHDRAWN: "warning",
}

const linkStateTones: Record<AcademicTeacherLinkState, Tone> = {
  CURRENT: "success",
  ENDED: "neutral",
  SCHEDULED: "warning",
}

const periodStatusTones: Record<AcademicPeriodStatus, Tone> = {
  ACTIVE: "success",
  CLOSED: "neutral",
  CONFIGURED: "warning",
}

// The texts of the academic screens that come from codes: the statuses and kinds (by code, never by the
// backend's text), the dates of a range, and the blockers the backend describes in English, in the
// person's language. A blocker naming a unit uses the unit's name when the person knows it.
export const useAcademicLabels = (units?: Pick<AcademicUnits, "nameOf">) => {
  const { i18n, t } = useTranslation()

  const periodStatusLabel = (status: AcademicPeriodStatus) => t(`academic.periodStatuses.${status}`)
  const periodStatusTone = (status: AcademicPeriodStatus) => periodStatusTones[status]
  const periodKindLabel = (kind: AcademicPeriodKind) => t(`academic.periodKinds.${kind}`)
  const catalogStatusLabel = (status: AcademicCatalogStatus) => t(`academic.catalogStatuses.${status}`)
  const catalogStatusTone = (status: AcademicCatalogStatus) => catalogStatusTones[status]
  const classStatusLabel = (status: AcademicClassStatus) => t(`academic.classStatuses.${status}`)
  const classStatusTone = (status: AcademicClassStatus) => classStatusTones[status]
  const shiftLabel = (shift: AcademicShiftCode) => t(`academic.shifts.${shift}`)
  const calendarCategoryLabel = (category: AcademicCalendarCategory) => t(`academic.calendarCategories.${category}`)
  const calendarCategoryTone = (category: AcademicCalendarCategory) => calendarCategoryTones[category]
  const calendarVersionLabel = (status: AcademicCalendarVersionStatus) => t(`academic.calendarVersions.${status}`)
  const calendarVersionTone = (status: AcademicCalendarVersionStatus) => calendarVersionTones[status]
  const linkStateLabel = (state: AcademicTeacherLinkState) => t(`academic.linkStates.${state}`)
  const linkStateTone = (state: AcademicTeacherLinkState) => linkStateTones[state]
  const pendencyLabel = (pendency: AcademicClassPendency) => t(`academic.pendencies.${pendency}`)

  // A range of days: a single day when it starts and ends on the same one, "from" when it has no end.
  const dateRange = (start: string, end: string | null) => {
    if (!end) return t("academic.dateFrom", { start: formatDate(start) })
    if (end === start) return formatDate(start)
    return t("academic.dateRange", { end: formatDate(end), start: formatDate(start) })
  }

  // A moment (an event, a reading of the enrollment) in the person's language and time zone.
  const formatMoment = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

  const blockerText = (sentence: string) => {
    const blocker = readAcademicBlocker(sentence)
    if (blocker.key === "activeOffersInUnit") {
      const unitId = blocker.unitId ?? 0
      return t("academic.blockers.activeOffersInUnit", {
        unit: units?.nameOf(unitId) ?? t("academic.unitNumber", { id: unitId }),
      })
    }
    return t(`academic.blockers.${blocker.key}`, { count: blocker.count ?? 0 })
  }

  return {
    blockerText,
    calendarCategoryLabel,
    calendarCategoryTone,
    calendarVersionLabel,
    calendarVersionTone,
    catalogStatusLabel,
    catalogStatusTone,
    classStatusLabel,
    classStatusTone,
    dateRange,
    formatMoment,
    linkStateLabel,
    linkStateTone,
    pendencyLabel,
    periodKindLabel,
    periodStatusLabel,
    periodStatusTone,
    shiftLabel,
  }
}
