import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import { useSignedInUser } from "@/hooks"
import type { Enrollment, EnrollmentParty } from "@/models"
import { pageRoles } from "@/routes/access"
import { paths } from "@/routes/paths"
import { canOpenPage } from "@/utils/access"
import { formatDate } from "@/utils/dates"

import { preparationStatuses, useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { AccessItem, AccessItems } from "../shared/userAccess/userAccess.styles"

export type EnrollmentPreparationProps = {
  enrollment: Enrollment
  // "Escolher participantes", beside the guardians' pendency: opens the choice in the Responsáveis tab.
  onChooseParticipants: () => void
}

// The preparation at a glance (JLM-342, 375 in part): the student as Pessoas has them now (only an active
// student can be confirmed; a record is fixed in Pessoas, never here), the guardians and the class chosen,
// what is still missing - the pendencies the server works out on every read - and the stages that don't
// exist yet, which are never taken as fulfilled. An abandoned preparation shows its reason.
export const EnrollmentPreparation = (props: EnrollmentPreparationProps) => {
  const { enrollment, onChooseParticipants } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { formatMoment, kindLabel, pendencyLabel, stageLabel } = useEnrollmentLabels()
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const { classContext, student } = enrollment
  const inPreparation = preparationStatuses.includes(enrollment.status)
  const canOpenStudent = canOpenPage(signedIn, pageRoles.students)
  const canChoose = enrollment.eligibleActions.includes("CHOOSE_PARTIES")
  const firstGuardianPendency = enrollment.pendencies.find((pendency) => pendency.category === "GUARDIANS")
  const studentPath = generatePath(paths.studentProfile, { studentId: String(student.id) })

  const studentName = canOpenStudent ? (
    <Text as={Link} color="brand" fontSize="sm" to={studentPath} semibold>
      {student.name}
    </Text>
  ) : (
    student.name
  )

  const partyRoles = (party: EnrollmentParty) =>
    [party.financial && t("enrollments.roles.financial"), party.signatory && t("enrollments.roles.signatory")]
      .filter(Boolean)
      .join(" · ")

  return (
    <PersonSections>
      <PersonBlock
        action={
          canOpenStudent &&
          inPreparation && (
            <Button as={Link} size="small" to={studentPath} variant="outlined">
              {t("enrollments.openStudent")}
            </Button>
          )
        }
        title={t("enrollments.preparation.studentTitle")}
      >
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "name", label: t("enrollments.preparation.studentName"), value: studentName },
            { key: "code", label: t("enrollments.preparation.studentCode"), value: student.code ?? "" },
            {
              key: "status",
              label: t("enrollments.preparation.studentStatus"),
              value: <Badge tone={personStatusTone(student.status)}>{personStatusLabel(student.status)}</Badge>,
            },
            {
              key: "eligible",
              label: t("enrollments.preparation.confirmation"),
              value: student.eligible
                ? t("enrollments.preparation.eligible")
                : t("enrollments.preparation.notEligible"),
            },
          ]}
        />
      </PersonBlock>

      <PersonBlock title={t("enrollments.preparation.guardiansTitle")}>
        {enrollment.parties.length === 0 ? (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.preparation.noGuardians")}
          </Text>
        ) : (
          <AccessItems aria-label={t("enrollments.preparation.guardiansTitle")}>
            {enrollment.parties.map((party) => (
              <AccessItem key={party.guardianId}>
                <Text fontSize="sm" semibold>
                  {party.guardianName}
                </Text>
                <Text color="secondary" fontSize="sm">
                  {partyRoles(party) || t("enrollments.roles.none")}
                </Text>
                {!party.linkActive && <Badge tone="warning">{t("enrollments.preparation.linkEnded")}</Badge>}
              </AccessItem>
            ))}
          </AccessItems>
        )}
      </PersonBlock>

      <PersonBlock title={t("enrollments.preparation.classTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "class",
              label: t("enrollments.class.class"),
              value: classContext
                ? [classContext.code, classContext.name].filter(Boolean).join(" · ")
                : t("enrollments.preparation.noClass"),
            },
            {
              key: "startDate",
              label: t("enrollments.startDate.title"),
              value: enrollment.startDate ? formatDate(enrollment.startDate) : t("enrollments.startDate.none"),
            },
            { key: "kind", label: t("enrollments.kind"), value: kindLabel(enrollment.kind) },
          ]}
        />
      </PersonBlock>

      {enrollment.enrollmentNumber && (
        <PersonBlock title={t("enrollments.preparation.confirmedTitle")}>
          <DescriptionList
            emptyValue={t("common.notInformed")}
            items={[
              { key: "number", label: t("enrollments.number"), value: enrollment.enrollmentNumber },
              {
                key: "confirmedAt",
                label: t("enrollments.preparation.confirmedAt"),
                value: enrollment.confirmedAt ? formatMoment(enrollment.confirmedAt) : "",
              },
            ]}
          />
        </PersonBlock>
      )}

      {inPreparation && (
        <PersonBlock title={t("enrollments.preparation.pendenciesTitle")}>
          {enrollment.pendencies.length === 0 ? (
            <Text color="secondary" fontSize="sm">
              {enrollment.eligibleActions.includes("CONFIRM")
                ? t("enrollments.preparation.readyToConfirm")
                : t("enrollments.preparation.noPendencies")}
            </Text>
          ) : (
            <AccessItems aria-label={t("enrollments.preparation.pendenciesTitle")}>
              {enrollment.pendencies.map((pendency) => (
                <AccessItem key={pendency.code}>
                  <Text color="warning" fontSize="sm" semibold>
                    {pendencyLabel(pendency.code)}
                  </Text>
                  {canChoose && pendency === firstGuardianPendency && (
                    <span>
                      <Button onClick={onChooseParticipants} size="small" variant="outlined">
                        {t("enrollments.guardians.chooseParticipants")}
                      </Button>
                    </span>
                  )}
                </AccessItem>
              ))}
            </AccessItems>
          )}
        </PersonBlock>
      )}

      {inPreparation && enrollment.notEvaluated.length > 0 && (
        <PersonBlock title={t("enrollments.preparation.notEvaluatedTitle")}>
          <Text color="secondary" fontSize="sm">
            {t("enrollments.preparation.notEvaluatedDescription")}
          </Text>
          <AccessItems aria-label={t("enrollments.preparation.notEvaluatedTitle")}>
            {enrollment.notEvaluated.map((stage) => (
              <AccessItem key={stage}>
                <Text fontSize="sm">{stageLabel(stage)}</Text>
                <Badge tone="neutral">{t("enrollments.preparation.notEvaluated")}</Badge>
              </AccessItem>
            ))}
          </AccessItems>
        </PersonBlock>
      )}

      {enrollment.status === "ABANDONED" && (
        <PersonBlock title={t("enrollments.preparation.abandonedTitle")}>
          <Text fontSize="sm">{enrollment.abandonReason ?? t("common.notInformed")}</Text>
        </PersonBlock>
      )}
    </PersonSections>
  )
}
