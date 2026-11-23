import { useTranslation } from "react-i18next"

import { Badge, Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import type { GuardianInvitation, Student360Guardian } from "@/models"
import { formatDate } from "@/utils/dates"

import { PersonSection, PersonSections } from "../shared/people/people.styles"
import { AccessLines, PersonCell } from "../shared/userAccess/userAccess.styles"

export type StudentGuardiansProps = {
  guardians: Student360Guardian[]
  invitations: GuardianInvitation[]
  showInvitations: boolean
}

// A guardian of the table: its link's id as the row key, and a field for each column.
type GuardianRow = Student360Guardian & { id: number; period: string; responsibilities: string; status: string }

// The student's guardians, each with its own link: the relationship, the three independent
// responsibilities, the period and whether the link is active or ended (an ended link stays as history).
// The guardian comes masked. Below, the guardians invited from this student and where each invitation is.
export const StudentGuardians = (props: StudentGuardiansProps) => {
  const { guardians, invitations, showInvitations } = props

  const { t } = useTranslation()

  const renderGuardian = (row: GuardianRow) => (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {row.guardian.fullName}
      </Text>
      {row.guardian.maskedEmail && (
        <Text color="secondary" fontSize="sm">
          {row.guardian.maskedEmail}
        </Text>
      )}
    </PersonCell>
  )

  const renderResponsibilities = (row: GuardianRow) => {
    const flags = [
      row.link.pedagogicalResponsible && t("students.links.pedagogical"),
      row.link.financialResponsible && t("students.links.financial"),
      row.link.contactAuthorized && t("students.links.contact"),
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

  const renderPeriod = (row: GuardianRow) => {
    const start = row.link.startDate ? formatDate(row.link.startDate) : t("common.notInformed")
    const text = row.link.endDate
      ? t("students.links.periodEnded", { end: formatDate(row.link.endDate), start })
      : t("students.links.periodSince", { start })

    return <Text fontSize="sm">{text}</Text>
  }

  return (
    <PersonSections>
      <PersonSection aria-label={t("students.links.title")}>
        <Text as="h2" fontSize="md" semibold>
          {t("students.links.title")}
        </Text>
        <Table
          dataKey="id"
          emptyMessage={t("students.links.empty")}
          value={guardians.map((item) => ({
            ...item,
            id: item.link.id,
            period: "",
            responsibilities: "",
            status: item.link.status,
          }))}
        >
          <Table.Column body={renderGuardian} field="guardian" header={t("guardians.guardian")} />
          <Table.Column
            body={(row: GuardianRow) => <Text fontSize="sm">{row.link.relationshipLabel}</Text>}
            field="link"
            header={t("students.links.relationship")}
          />
          <Table.Column
            body={renderResponsibilities}
            field="responsibilities"
            header={t("students.links.responsibilities")}
          />
          <Table.Column body={renderPeriod} field="period" header={t("students.links.period")} />
          <Table.Column
            body={(row: GuardianRow) => (
              <Badge tone={row.link.status === "ACTIVE" ? "success" : "neutral"}>
                {t(`students.links.linkStatuses.${row.link.status}`)}
              </Badge>
            )}
            field="status"
            header={t("people.status")}
          />
        </Table>
      </PersonSection>

      {showInvitations && (
        <PersonSection aria-label={t("students.invitations.title")}>
          <Text as="h2" fontSize="md" semibold>
            {t("students.invitations.title")}
          </Text>
          <Table dataKey="id" emptyMessage={t("students.invitations.empty")} value={invitations}>
            <Table.Column
              body={(row: GuardianInvitation) => (
                <PersonCell>
                  <Text fontSize="sm" semibold>
                    {row.guardianName ?? row.email}
                  </Text>
                  {row.guardianName && (
                    <Text color="secondary" fontSize="sm">
                      {row.email}
                    </Text>
                  )}
                </PersonCell>
              )}
              field="email"
              header={t("guardians.guardian")}
            />
            <Table.Column
              body={(row: GuardianInvitation) => (
                <Badge tone={row.status === "AWAITING_CONFIRMATION" ? "warning" : "neutral"}>
                  {t(`students.invitations.statuses.${row.status}`)}
                </Badge>
              )}
              field="status"
              header={t("people.status")}
            />
          </Table>
        </PersonSection>
      )}
    </PersonSections>
  )
}
