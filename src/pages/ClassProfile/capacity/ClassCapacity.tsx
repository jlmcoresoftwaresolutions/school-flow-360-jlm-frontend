import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { DescriptionList, StateMessage } from "@/ds-components/molecules"
import type { AcademicClassCapacity } from "@/models"
import { getAcademicClassCapacity } from "@/services/academicClassDetail"

import { useAcademicLabels } from "../../shared/academic/useAcademicLabels"
import { PersonSections } from "../../shared/people/people.styles"
import { PersonBlock } from "../../shared/people/PersonBlock"
import { CapacityExceptionModal } from "./CapacityExceptionModal"
import { CapacityReviewModal } from "./CapacityReviewModal"

export type ClassCapacityProps = {
  classId: number
  // A change was made: the class is read again.
  onChanged: () => void
  // Changes whenever the class changed, to read the capacity again.
  refreshKey: number
}

type CapacityResult = { error: true; key: string } | { capacity: AcademicClassCapacity; key: string }

type Dialog = "exception" | "review" | null

// The Capacity tab of a class (the unit's management only): the limit, the occupation from the enrollment
// with when it was read, the seats (limit minus occupation, never below zero, no reservation) and any
// excess apart. While the enrollment doesn't answer, the occupation, seats and excess say "unavailable",
// never zero. The limit is reviewed with a reason, and the formal exception is offered only when the
// institution turns it on.
export const ClassCapacity = (props: ClassCapacityProps) => {
  const { classId, onChanged, refreshKey } = props

  const { t } = useTranslation()
  const { formatMoment } = useAcademicLabels()

  const [result, setResult] = useState<CapacityResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${classId}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const capacity = await getAcademicClassCapacity(classId, { showLoading: false })
        if (!isStale) setResult({ capacity, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [classId, requestKey])

  const current = result?.key.startsWith(`${classId}#`) ? result : null

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("classCapacity.loading")}
      </Text>
    )
  }

  if ("error" in current) {
    return (
      <StateMessage
        action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
        description={t("classCapacity.errorDescription")}
        title={t("classCapacity.errorTitle")}
        variant="error"
      />
    )
  }

  const { capacity } = current
  const isAvailable = capacity.occupation.status === "AVAILABLE"
  const unavailable = t("classCapacity.unavailable")
  const afterChange = () => {
    setDialog(null)
    onChanged()
  }

  return (
    <PersonSections>
      <PersonBlock
        action={
          capacity.eligibleActions.includes("REVIEW_CAPACITY") ? (
            <Button onClick={() => setDialog("review")} size="small" variant="outlined">
              {t("classCapacity.review.action")}
            </Button>
          ) : undefined
        }
        title={t("classCapacity.title")}
      >
        <DescriptionList
          items={[
            { key: "limit", label: t("classCapacity.limit"), value: String(capacity.capacity) },
            {
              key: "occupation",
              label: t("classCapacity.occupation"),
              value: isAvailable ? String(capacity.occupation.value ?? 0) : unavailable,
            },
            {
              key: "seats",
              label: t("classCapacity.seats"),
              value: isAvailable && capacity.seats !== null ? String(capacity.seats) : unavailable,
            },
            {
              key: "excess",
              label: t("classCapacity.excess"),
              value: isAvailable && capacity.excess !== null ? String(capacity.excess) : unavailable,
            },
          ]}
        />
        <Text color="secondary" fontSize="sm">
          {isAvailable && capacity.occupation.asOf
            ? t("classCapacity.asOf", { date: formatMoment(capacity.occupation.asOf) })
            : t("classCapacity.unavailableHelp")}
        </Text>
      </PersonBlock>

      <PersonBlock
        action={
          capacity.eligibleActions.includes("AUTHORIZE_EXCEPTION") ? (
            <Button onClick={() => setDialog("exception")} size="small" variant="outlined">
              {t("classCapacity.exception.action")}
            </Button>
          ) : undefined
        }
        title={t("classCapacity.exception.sectionTitle")}
      >
        <Text color="secondary" fontSize="sm">
          {capacity.exceptionEnabled ? t("classCapacity.exception.enabled") : t("classCapacity.exception.off")}
        </Text>
      </PersonBlock>

      {dialog === "review" && (
        <CapacityReviewModal capacity={capacity} onChanged={afterChange} onClose={() => setDialog(null)} />
      )}
      {dialog === "exception" && (
        <CapacityExceptionModal classId={classId} onChanged={afterChange} onClose={() => setDialog(null)} />
      )}
    </PersonSections>
  )
}
