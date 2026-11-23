import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import type { StudentGuardianLink } from "@/models"
import { paths } from "@/routes/paths"

import { LinkPeriod, LinkResponsibilities, LinkStatusBadge } from "../shared/people/LinkCells"
import { PersonBlock } from "../shared/people/PersonBlock"
import { PersonCell } from "../shared/userAccess/userAccess.styles"

export type GuardianStudentsProps = {
  links: StudentGuardianLink[]
}

// A link of the table, with a field for each column.
type LinkRow = StudentGuardianLink & { period: string; responsibilities: string }

// The guardian's students (only the ones in the operator's reach), each with the link that ties them:
// the relationship, the three responsibilities, the period and whether it is active or ended. The
// student's name opens its profile.
export const GuardianStudents = (props: GuardianStudentsProps) => {
  const { links } = props

  const { t } = useTranslation()

  const rows: LinkRow[] = links.map((link) => ({ ...link, period: "", responsibilities: "" }))

  return (
    <PersonBlock title={t("guardians.links.title")}>
      <Table dataKey="id" emptyMessage={t("guardians.links.empty")} value={rows}>
        <Table.Column
          body={(row: LinkRow) => (
            <PersonCell>
              <Text
                as={Link}
                color="brand"
                fontSize="sm"
                to={generatePath(paths.studentProfile, { studentId: String(row.student.id) })}
                semibold
              >
                {row.student.name}
              </Text>
              {row.student.code && (
                <Text color="secondary" fontSize="sm">
                  {row.student.code}
                </Text>
              )}
            </PersonCell>
          )}
          field="student"
          header={t("students.student")}
        />
        <Table.Column
          body={(row: LinkRow) => <Text fontSize="sm">{row.relationshipLabel}</Text>}
          field="relationshipLabel"
          header={t("students.links.relationship")}
        />
        <Table.Column
          body={(row: LinkRow) => <LinkResponsibilities link={row} />}
          field="responsibilities"
          header={t("students.links.responsibilities")}
        />
        <Table.Column
          body={(row: LinkRow) => <LinkPeriod link={row} />}
          field="period"
          header={t("students.links.period")}
        />
        <Table.Column
          body={(row: LinkRow) => <LinkStatusBadge link={row} />}
          field="status"
          header={t("people.status")}
        />
      </Table>
    </PersonBlock>
  )
}
