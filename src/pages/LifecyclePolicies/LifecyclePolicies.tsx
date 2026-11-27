import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Card } from "@/ds-components/atoms"
import { PageHeader, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import { listAcademicGrades, listAcademicStages } from "@/services/academicCatalog"
import { listAcademicPeriods } from "@/services/academicPeriods"
import { hasAnyRole } from "@/utils/access"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { LockPoliciesTab } from "./LockPoliciesTab"
import { NoEffectRulesTab } from "./NoEffectRulesTab"
import { TemplatesTab } from "./TemplatesTab"

// The policies the lifecycle events read (EPIC 7, backend Fatia H): data the school publishes, never code.
// Three tabs: the maximum length of a lock per unit and stage, the institutional "no financial effect"
// rule per unit, offer and event type (what lifts the financial blocker until the financial module
// exists), and the text of each notification. Only the Admin publishes; the Secretaria reads its units.
export const LifecyclePolicies = () => {
  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const units = useAcademicUnits()
  const stages = useAcademicDirectory(listAcademicStages)
  const grades = useAcademicDirectory(listAcademicGrades)
  const periods = useAcademicDirectory(listAcademicPeriods)

  const [tab, setTab] = useState("lock")

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])

  return (
    <>
      <PageHeader
        description={t("lifecyclePolicies.description")}
        icon="briefcase-outline"
        title={t("shell.nav.lifecyclePolicies")}
      />

      <Tabs
        items={[
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <LockPoliciesTab isAdmin={isAdmin} stages={stages.items} units={units} />
              </Card>
            ),
            icon: "lock-outline",
            key: "lock",
            label: t("lifecyclePolicies.tabs.lock"),
          },
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <NoEffectRulesTab grades={grades.items} isAdmin={isAdmin} periods={periods.items} units={units} />
              </Card>
            ),
            icon: "money-outline",
            key: "noEffect",
            label: t("lifecyclePolicies.tabs.noEffect"),
          },
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <TemplatesTab isAdmin={isAdmin} />
              </Card>
            ),
            icon: "chat-outline",
            key: "templates",
            label: t("lifecyclePolicies.tabs.templates"),
          },
        ]}
        label={t("lifecyclePolicies.tabs.label")}
        onChange={setTab}
        value={tab}
        attached
      />
    </>
  )
}
