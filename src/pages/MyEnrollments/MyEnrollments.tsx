import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, type BadgeProps, Button, Card, Text } from "@/ds-components/atoms"
import { DescriptionList, PageHeader, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { MyEnrollment, MyEnrollmentStatus } from "@/models"
import { listMyEnrollments } from "@/services/enrollments"
import { formatDate } from "@/utils/dates"

import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"

type BadgeTone = NonNullable<BadgeProps["tone"]>

type LoadResult = { error: true; key: number } | { items: MyEnrollment[]; key: number }

const statusTones: Record<MyEnrollmentStatus, BadgeTone> = {
  ACTIVE: "success",
  CANCELLED: "neutral",
  COMPLETED: "info",
  IN_PREPARATION: "warning",
  LOCKED: "neutral",
  TRANSFERRED: "neutral",
}

// The enrollments of the Aluno and the Responsável (decided by Lucas on 24/11/2026, answer 18; backend
// slice 3C): the student's own, and the guardian's, of each student they are linked to now. Only the
// minimum: the status, the unit and, once confirmed, the number, the start date and the class. A
// preparation is only "in preparation", never in detail; documents, the contract text, financial data,
// pendencies and the school's history never show here. The contract is accepted by the e-mail's link.
export const MyEnrollments = () => {
  const { t } = useTranslation()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const current = result?.key === reloadToken ? result : null
  const enrollments = current && "items" in current ? current.items : null
  const students = [...new Map((enrollments ?? []).map((item) => [item.studentId, item.studentName])).entries()]

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const items = await listMyEnrollments({ showLoading: false })
        if (!isStale) setResult({ items, key: reloadToken })
      } catch {
        if (!isStale) setResult({ error: true, key: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const statusLabel = (status: MyEnrollmentStatus) =>
    status === "IN_PREPARATION" ? t("myEnrollments.inPreparation") : t(`enrollments.statuses.${status}`)

  const renderEnrollment = (enrollment: MyEnrollment) => (
    <div key={enrollment.id} style={{ display: "flex", flexDirection: "column", gap: spacing[12] }}>
      <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
        <Text fontSize="sm" semibold>
          {enrollment.enrollmentNumber
            ? t("myEnrollments.number", { number: enrollment.enrollmentNumber })
            : t("myEnrollments.noNumber")}
        </Text>
        <Badge tone={statusTones[enrollment.status]}>{statusLabel(enrollment.status)}</Badge>
      </span>
      {enrollment.status === "IN_PREPARATION" ? (
        <Text color="secondary" fontSize="sm">
          {t("myEnrollments.inPreparationDescription", { unit: enrollment.unitName ?? "" })}
        </Text>
      ) : (
        <DescriptionList
          columns={3}
          items={[
            { key: "unit", label: t("myEnrollments.unit"), value: enrollment.unitName },
            { key: "class", label: t("myEnrollments.class"), value: enrollment.className },
            {
              key: "startDate",
              label: t("myEnrollments.startDate"),
              value: enrollment.startDate ? formatDate(enrollment.startDate) : null,
            },
          ]}
          emptyValue={t("common.notInformed")}
        />
      )}
    </div>
  )

  const renderContent = () => {
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("myEnrollments.loading")}
        </Text>
      )
    }

    if ("error" in current) {
      return (
        <StateMessage
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
              {t("common.tryAgain")}
            </Button>
          }
          description={t("myEnrollments.errorDescription")}
          title={t("myEnrollments.errorTitle")}
          variant="error"
        />
      )
    }

    if (current.items.length === 0) {
      return (
        <StateMessage
          description={t("myEnrollments.emptyDescription")}
          icon="contract-outline"
          title={t("myEnrollments.emptyTitle")}
        />
      )
    }

    return (
      <PersonSections>
        {students.map(([studentId, studentName]) => (
          <PersonBlock key={studentId} title={studentName ?? t("myEnrollments.student")}>
            {current.items.filter((item) => item.studentId === studentId).map(renderEnrollment)}
          </PersonBlock>
        ))}
        <Text color="secondary" fontSize="sm">
          {t("myEnrollments.contractNote")}
        </Text>
      </PersonSections>
    )
  }

  return (
    <>
      <PageHeader
        description={t("myEnrollments.description")}
        icon="contract-outline"
        title={t("shell.nav.myEnrollments")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>
    </>
  )
}
