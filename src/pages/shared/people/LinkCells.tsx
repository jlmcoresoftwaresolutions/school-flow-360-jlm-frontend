import { useTranslation } from "react-i18next"

import { Badge, Text } from "@/ds-components/atoms"
import type { StudentGuardianLink } from "@/models"
import { formatDate } from "@/utils/dates"

import { AccessLines } from "../userAccess/userAccess.styles"

export type LinkCellProps = {
  link: StudentGuardianLink
}

export type LinkResponsibilitiesProps = {
  link: Pick<StudentGuardianLink, "contactAuthorized" | "financialResponsible" | "pedagogicalResponsible">
}

// The three independent responsibilities a link (or an invitation, which proposes one) carries, one per
// line.
export const LinkResponsibilities = (props: LinkResponsibilitiesProps) => {
  const { link } = props

  const { t } = useTranslation()

  const flags = [
    link.pedagogicalResponsible && t("students.links.pedagogical"),
    link.financialResponsible && t("students.links.financial"),
    link.contactAuthorized && t("students.links.contact"),
  ].filter((flag): flag is string => Boolean(flag))

  if (flags.length === 0) {
    return (
      <Text color="secondary" fontSize="sm">
        {t("students.links.noResponsibility")}
      </Text>
    )
  }

  return (
    <AccessLines>
      {flags.map((flag) => (
        <Text key={flag} fontSize="sm">
          {flag}
        </Text>
      ))}
    </AccessLines>
  )
}

// Since when the link holds, or when it held (an ended link stays as history).
export const LinkPeriod = (props: LinkCellProps) => {
  const { link } = props

  const { t } = useTranslation()

  const start = link.startDate ? formatDate(link.startDate) : t("common.notInformed")
  const text = link.endDate
    ? t("students.links.periodEnded", { end: formatDate(link.endDate), start })
    : t("students.links.periodSince", { start })

  return <Text fontSize="sm">{text}</Text>
}

export const LinkStatusBadge = (props: LinkCellProps) => {
  const { link } = props

  const { t } = useTranslation()

  return (
    <Badge tone={link.status === "ACTIVE" ? "success" : "neutral"}>
      {t(`students.links.linkStatuses.${link.status}`)}
    </Badge>
  )
}
