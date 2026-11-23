import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Card } from "@/ds-components/atoms"
import { PageHeader, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { listAcademicStages } from "@/services/academicCatalog"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { GradesTab } from "./GradesTab"
import { StagesTab } from "./StagesTab"

// The stages and grades of the institution (P04-S03), in two tabs: the stages, in their order, and the
// grades, each of one stage. The catalog is the institution's, reused by the offers of each unit and
// period. Nothing is deleted: an inactive item leaves the new choices and keeps every old reference. A
// Professor only reads.
export const GradeLevels = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
  const stages = useAcademicDirectory(listAcademicStages)

  const [tab, setTab] = useState("stages")

  return (
    <>
      <PageHeader
        description={t("academic.descriptions.gradeLevels")}
        icon="school-outline"
        title={t("shell.nav.gradeLevels")}
      />

      <Tabs
        items={[
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <StagesTab onCatalogChanged={stages.reload} stages={stages.items} units={units} />
              </Card>
            ),
            icon: "school-outline",
            key: "stages",
            label: t("gradeLevels.stages.tab"),
          },
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <GradesTab stages={stages.items} units={units} />
              </Card>
            ),
            icon: "book-outline",
            key: "grades",
            label: t("gradeLevels.grades.tab"),
          },
        ]}
        label={t("gradeLevels.sectionsLabel")}
        onChange={setTab}
        value={tab}
        attached
      />
    </>
  )
}
