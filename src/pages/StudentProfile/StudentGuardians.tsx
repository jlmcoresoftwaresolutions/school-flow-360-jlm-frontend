import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { ActionMenu } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { CatalogItem, GuardianInvitation, Student360Guardian, StudentGuardianLink } from "@/models"
import { paths } from "@/routes/paths"

import { LinkPeriod, LinkResponsibilities, LinkStatusBadge } from "../shared/people/LinkCells"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { AnonymizedBadge } from "../shared/people/privacy/AnonymizedBadge"
import { ActionRow, PersonCell } from "../shared/userAccess/userAccess.styles"
import type { InvitationDecision } from "./links/InvitationDecisionDialog"

export type StudentGuardiansProps = {
  // A new link or invitation can be made (the student isn't inactive nor anonymized).
  canAdd: boolean
  // The links and the invitations can be changed (the student isn't anonymized).
  canChange: boolean
  guardians: Student360Guardian[]
  invitations: GuardianInvitation[]
  relationshipTypes: CatalogItem[]
  showInvitations: boolean
  onDecide: (invitation: GuardianInvitation, decision: InvitationDecision) => void
  onEditLink: (link: StudentGuardianLink, guardianName: string) => void
  onEndLink: (link: StudentGuardianLink, guardianName: string) => void
  onInvite: () => void
  onNewLink: () => void
}

// An invitation of the table, with a field for each column.
type InvitationRow = GuardianInvitation & { actions: string; responsibilities: string }

// A guardian of the table: its link's id as the row key, and a field for each column.
type GuardianRow = Student360Guardian & {
  actions: string
  id: number
  period: string
  responsibilities: string
  status: string
}

// The student's guardians, each with its own link: the relationship, the three independent
// responsibilities, the period and whether the link is active or ended (an ended link stays as history).
// The guardian comes masked, its name opening its profile. An active link can be changed or ended; a
// guardian is linked (one already registered) or invited by e-mail from here. Below, the guardians
// invited from this student and where each invitation is: one the guardian accepted waits for the
// school to confirm or reject it.
export const StudentGuardians = (props: StudentGuardiansProps) => {
  const {
    canAdd,
    canChange,
    guardians,
    invitations,
    onDecide,
    onEditLink,
    onEndLink,
    onInvite,
    onNewLink,
    relationshipTypes,
    showInvitations,
  } = props

  const { t } = useTranslation()

  const rows: GuardianRow[] = guardians.map((item) => ({
    ...item,
    actions: "",
    id: item.link.id,
    period: "",
    responsibilities: "",
    status: item.link.status,
  }))

  const invitationRows: InvitationRow[] = invitations.map((item) => ({ ...item, actions: "", responsibilities: "" }))

  const relationshipLabel = (code: string) => relationshipTypes.find((type) => type.code === code)?.label ?? code

  const renderLinkActions = (row: GuardianRow) => {
    if (!canChange || row.link.status !== "ACTIVE") return null

    return (
      <ActionMenu
        items={[
          {
            icon: "pen-outline",
            key: "edit",
            label: t("guardianLinks.edit.action"),
            onClick: () => onEditLink(row.link, row.guardian.fullName),
          },
          {
            icon: "x-circle-outline",
            key: "end",
            label: t("guardianLinks.end.action"),
            onClick: () => onEndLink(row.link, row.guardian.fullName),
            tone: "danger",
          },
        ]}
        triggerLabel={t("guardianLinks.actionsFor", { name: row.guardian.fullName })}
      />
    )
  }

  const renderInvitationActions = (row: InvitationRow) => {
    if (!canChange || row.status !== "AWAITING_CONFIRMATION") return null

    return (
      <ActionMenu
        items={[
          {
            icon: "check-circle-outline",
            key: "confirm",
            label: t("guardianLinks.decision.confirm.action"),
            onClick: () => onDecide(row, "confirm"),
          },
          {
            icon: "x-circle-outline",
            key: "reject",
            label: t("guardianLinks.decision.reject.action"),
            onClick: () => onDecide(row, "reject"),
            tone: "danger",
          },
        ]}
        triggerLabel={t("guardianLinks.actionsFor", { name: row.guardianName ?? row.email })}
      />
    )
  }

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
      {row.guardian.anonymized && <AnonymizedBadge />}
      {row.guardian.maskedEmail && (
        <Text color="secondary" fontSize="sm">
          {row.guardian.maskedEmail}
        </Text>
      )}
    </PersonCell>
  )

  return (
    <PersonSections>
      <PersonBlock
        action={
          canAdd && (
            <ActionRow>
              <Button onClick={onInvite} size="small" variant="outlined">
                {t("guardianLinks.invite.action")}
              </Button>
              <Button onClick={onNewLink} size="small">
                {t("guardianLinks.create.action")}
              </Button>
            </ActionRow>
          )
        }
        title={t("students.links.title")}
      >
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
          <Table.Column
            align="right"
            body={renderLinkActions}
            field="actions"
            header={t("guardianLinks.actions")}
            width="1%"
          />
        </Table>
      </PersonBlock>

      {showInvitations && (
        <PersonBlock title={t("students.invitations.title")}>
          <Table dataKey="id" emptyMessage={t("students.invitations.empty")} value={invitationRows}>
            <Table.Column
              body={(row: InvitationRow) => (
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
              body={(row: InvitationRow) => <Text fontSize="sm">{relationshipLabel(row.relationshipCode)}</Text>}
              field="relationshipCode"
              header={t("students.links.relationship")}
            />
            <Table.Column
              body={(row: InvitationRow) => <LinkResponsibilities link={row} />}
              field="responsibilities"
              header={t("students.links.responsibilities")}
            />
            <Table.Column
              body={(row: InvitationRow) => (
                <Badge tone={row.status === "AWAITING_CONFIRMATION" ? "warning" : "neutral"}>
                  {t(`students.invitations.statuses.${row.status}`)}
                </Badge>
              )}
              field="status"
              header={t("people.status")}
            />
            <Table.Column
              align="right"
              body={renderInvitationActions}
              field="actions"
              header={t("guardianLinks.actions")}
              width="1%"
            />
          </Table>
        </PersonBlock>
      )}
    </PersonSections>
  )
}
