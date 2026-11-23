import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { DescriptionList, StateMessage } from "@/ds-components/molecules"
import type { AcademicClassGeneral } from "@/models"
import { getAcademicClassGeneral } from "@/services/academicClassDetail"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"

export type ClassGeneralProps = {
  classId: number
  // Changes whenever the class changed, to read it again.
  refreshKey: number
}

type GeneralResult = { error: true; key: string } | { general: AcademicClassGeneral; key: string }

// The General tab of a class: what it is (code, name, grade and stage), where and when it is offered
// (unit, period, shift, room or no physical room), its capacity and subjects, its status and whether it
// is ready for enrollment, with what is still missing without stopping it. Read in its own call: if it
// fails, the rest of the detail stays.
export const ClassGeneral = (props: ClassGeneralProps) => {
  const { classId, refreshKey } = props

  const { t } = useTranslation()
  const { classStatusLabel, classStatusTone, pendencyLabel, shiftLabel } = useAcademicLabels()

  const [result, setResult] = useState<GeneralResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${classId}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const general = await getAcademicClassGeneral(classId, { showLoading: false })
        if (!isStale) setResult({ general, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [classId, requestKey])

  // Another class's answer is never shown while this one is read.
  const current = result?.key.startsWith(`${classId}#`) ? result : null

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("classes.profile.loading")}
      </Text>
    )
  }

  if ("error" in current) {
    return (
      <StateMessage
        action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
        description={t("classes.profile.generalErrorDescription")}
        title={t("classes.profile.generalErrorTitle")}
        variant="error"
      />
    )
  }

  const { general } = current
  const { schoolClass } = general

  return (
    <PersonSections>
      <PersonBlock title={t("classes.profile.identification")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "code", label: t("classes.code"), value: schoolClass.code },
            { key: "name", label: t("classes.name"), value: schoolClass.name },
            { key: "stage", label: t("classes.stage"), value: general.stageName },
            { key: "grade", label: t("classes.grade"), value: general.gradeName },
            { key: "unit", label: t("classes.unit"), value: general.unitName },
            { key: "period", label: t("classes.period"), value: general.periodName },
            { key: "shift", label: t("classes.shift"), value: shiftLabel(schoolClass.shift) },
            {
              key: "room",
              label: t("classes.room"),
              value: schoolClass.noPhysicalRoom ? t("classes.noPhysicalRoom") : general.roomName,
            },
            {
              key: "capacity",
              label: t("classes.capacity"),
              value: String(schoolClass.capacity),
            },
          ]}
        />
      </PersonBlock>

      <PersonBlock title={t("classes.profile.situation")}>
        <DescriptionList
          items={[
            {
              key: "status",
              label: t("academic.status"),
              value: <Badge tone={classStatusTone(schoolClass.status)}>{classStatusLabel(schoolClass.status)}</Badge>,
            },
            {
              key: "readiness",
              label: t("classes.readiness"),
              value: schoolClass.eligibleForEnrollment ? t("classes.ready") : t("classes.notReady"),
            },
            {
              fullWidth: true,
              key: "pendencies",
              label: t("classes.profile.pendencies"),
              value:
                schoolClass.pendencies.length > 0
                  ? schoolClass.pendencies.map(pendencyLabel).join(", ")
                  : t("classes.profile.noPendencies"),
            },
          ]}
        />
        {!schoolClass.eligibleForEnrollment && (
          <Text color="secondary" fontSize="sm">
            {t("classes.profile.readinessHelp")}
          </Text>
        )}
      </PersonBlock>

      <PersonBlock title={t("classes.profile.subjects")}>
        {general.subjects.length === 0 ? (
          <Text color="warning" fontSize="sm">
            {t("classes.profile.noSubjects")}
          </Text>
        ) : (
          <Text fontSize="sm">{general.subjects.map((subject) => `${subject.code} · ${subject.name}`).join(", ")}</Text>
        )}
      </PersonBlock>
    </PersonSections>
  )
}
