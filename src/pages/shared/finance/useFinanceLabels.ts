import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { FinanceReceiptMethod, FinanceReceiptStatus, FinanceTitleSituation } from "@/models"
import { formatCents } from "@/utils/money"

type BadgeTone = NonNullable<BadgeProps["tone"]>

// The situations of a title, in the order the filters offer them.
export const titleSituations: FinanceTitleSituation[] = [
  "OPEN",
  "PARTIAL",
  "SATISFIED",
  "WRITTEN_OFF",
  "CANCELLED",
  "SUBSTITUTED",
]

export const receiptMethods: FinanceReceiptMethod[] = ["PIX_MANUAL", "BANK_TRANSFER", "CASH", "CARD_MACHINE", "OTHER"]

const situationTones: Record<FinanceTitleSituation, BadgeTone> = {
  CANCELLED: "neutral",
  OPEN: "info",
  PARTIAL: "warning",
  SATISFIED: "success",
  SUBSTITUTED: "neutral",
  WRITTEN_OFF: "neutral",
}

const isMethod = (value: string): value is FinanceReceiptMethod => (receiptMethods as string[]).includes(value)

// The words of the financial screens: money in the person's language, a title's situation and a receipt's
// status and method by code (an unknown code shows as it came), and a competence (yyyy-MM) as a month.
export const useFinanceLabels = () => {
  const { i18n, t } = useTranslation()

  return {
    competenceLabel: (competence: string) => {
      const [year, month] = competence.split("-").map(Number)
      if (!year || !month) return competence
      return new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
        new Date(year, month - 1, 1),
      )
    },
    methodLabel: (method: string) => (isMethod(method) ? t(`finance.methods.${method}`) : method),
    money: (cents: number) => formatCents(cents, i18n.language),
    receiptStatusLabel: (status: FinanceReceiptStatus) => t(`finance.receiptStatuses.${status}`),
    receiptStatusTone: (status: FinanceReceiptStatus): BadgeTone => (status === "CONFIRMED" ? "success" : "warning"),
    situationLabel: (situation: FinanceTitleSituation) => t(`finance.situations.${situation}`),
    situationTone: (situation: FinanceTitleSituation): BadgeTone => situationTones[situation] ?? "neutral",
  }
}
