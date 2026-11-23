import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Badge, Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import type { GuardianInvitation, Student360Guardian } from "@/models"
import { paths } from "@/routes/paths"

import { LinkPeriod, LinkResponsibilities, LinkStatusBadge } from "../shared/people/LinkCells"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { PersonCell } from "../shared/userAccess/userAccess.styles"

export type StudentGuardiansProps = {
  guardians: Student360Guardian[]
  invitations: GuardianInvitation[]
  showInvitations: boolean
}

// A guardian of the table: its link's id as the row key, and a field for each column.
type GuardianRow = Student360Guardian & { id: number; period: string; responsibilities: string; status: string }

// The student's guardians, each with its own link: the relationship, the three independent
// responsibilities, the period and whether the link is active or ended (an ended link stays as history).
// The guardian comes masked, its name opening its profile. Below, the guardians invited from this
// student and where each invitation is.
export const StudentGuardians = (props: StudentGuardiansProps) => {
  const { guardians, invitations, showInvitations } = props

  const { t } = useTranslation()

  const rows: GuardianRow[] = guardians.map((item) => ({
    ...item,
    id: item.link.id,
    period: "",
    responsibilities: "",
    status: item.link.status,
  }))

  const renderGuardian = (row: GuardianRow) => (
    <PersonCell>
      <Text
        as={Link}
        color="brand"
        fontSize="sm"
        to={generatePath(paths.guardianProfile, { guardianId: String(row.guardian.id) })}
        semibold
      >
        {row.guardian.fullName}
      </Text>
      {row.guardian.maskedEmail && (
        <Text color="secondary" fontSize="sm">
          {row.guardian.maskedEmail}
        </Text>
      )}
    </PersonCell>
  )

  return (
    <PersonSections>
      <PersonBlock title={t("students.links.title")}>
        <Table dataKey="id" emptyMessage={t("students.links.empty")} value={rows}>
          <Table.Column body={renderGuardian} field="guardian" header={t("guardians.guardian")} />
          <Table.Column
            body={(row: GuardianRow) => <Text fontSize="sm">{row.link.relationshipLabel}</Text>}
            field="link"
            header={t("students.links.relationship")}
          />
          <Table.Column
            body={(row: GuardianRow) => <LinkResponsibilities link={row.link} />}
            field="responsibilities"
            header={t("students.links.responsibilities")}
          />
          <Table.Column
            body={(row: GuardianRow) => <LinkPeriod link={row.link} />}
            field="period"
            header={t("students.links.period")}
          />
          <Table.Column
            body={(row: GuardianRow) => <LinkStatusBadge link={row.link} />}
            field="status"
            header={t("people.status")}
          />
        </Table>
      </PersonBlock>

      {showInvitations && (
        <PersonBlock title={t("students.invitations.title")}>
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
        </PersonBlock>
      )}
    </PersonSections>
  )
}
