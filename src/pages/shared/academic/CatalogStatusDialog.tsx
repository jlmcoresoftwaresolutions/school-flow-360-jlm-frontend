import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicCatalogImpact } from "@/models"
import { getErrorCode, getErrorMessage } from "@/services/httpClient"

import { useFailureMessage } from "../people/useFailureMessage"
import { AccessItem, AccessItems } from "../userAccess/userAccess.styles"
import { readDependencyMessage } from "./academicBlockers"
import { useAcademicLabels } from "./useAcademicLabels"
import type { AcademicUnits } from "./useAcademicUnits"

export type CatalogStatusDialogProps = {
  action: "activate" | "inactivate"
  name: string
  units: AcademicUnits
  onChanged: () => void
  onClose: () => void
  // The change itself, with the version the item was read at.
  run: () => Promise<unknown>
  // What would block inactivating it, read before asking (the items that have an impact endpoint).
  loadImpact?: () => Promise<AcademicCatalogImpact>
}

type ImpactState = { blockers: string[] } | { error: true } | null

// Inactivates or reactivates an item of the academic catalog (a stage, a grade, a subject, an offer, a
// room), confirmed first with what it means: an inactive item leaves the new choices and keeps every old
// reference, nothing is deleted. Before inactivating, what depends on the item is read (when the backend
// tells it) and blocks the confirmation, listed for the person to regularize; the backend checks it
// again, and a refusal lists what it found.
export const CatalogStatusDialog = (props: CatalogStatusDialogProps) => {
  const { action, loadImpact, name, onChanged, onClose, run, units } = props

  const { t } = useTranslation()
  const { blockerText } = useAcademicLabels(units)
  const toFailureMessage = useFailureMessage()

  // The impact reader of the first render: a new function from the parent never reads it again.
  const [readImpact] = useState(() => loadImpact)
  const [impact, setImpact] = useState<ImpactState>(null)
  const [blockers, setBlockers] = useState<string[]>([])
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isInactivation = action === "inactivate"
  const waitsForImpact = isInactivation && Boolean(readImpact) && impact === null
  const shownBlockers = impact && "blockers" in impact && impact.blockers.length > 0 ? impact.blockers : blockers

  useEffect(() => {
    if (!isInactivation || !readImpact) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await readImpact()
        if (!isStale) setImpact({ blockers: loaded.blockers })
      } catch {
        if (!isStale) setImpact({ error: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [isInactivation, readImpact])

  const confirm = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      await run()
      toast.success(t(`academic.catalogStatus.${action}.done`, { name }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_DEPENDENCY_ACTIVE") {
        setBlockers(readDependencyMessage(getErrorMessage(error)))
      } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("academic.catalogStatus.changedMeanwhile"))
        onChanged()
      } else if (code === "ACADEMIC_NOT_ELIGIBLE" || code === "ACADEMIC_FIELD_INCOMPATIBLE") {
        setFailure(t("academic.catalogStatus.notEligible"))
      } else {
        setFailure(toFailureMessage(t(`academic.catalogStatus.${action}.failed`), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={waitsForImpact || shownBlockers.length > 0}
      confirmLabel={t(`academic.catalogStatus.${action}.confirm`)}
      description={t(`academic.catalogStatus.${action}.description`)}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t(`academic.catalogStatus.${action}.title`, { name })}
      tone={isInactivation ? "danger" : undefined}
      open
    >
      {waitsForImpact && (
        <Text color="secondary" fontSize="sm" role="status">
          {t("academic.catalogStatus.impactLoading")}
        </Text>
      )}

      {impact && "error" in impact && (
        <Text color="warning" fontSize="sm" role="note">
          {t("academic.catalogStatus.impactFailed")}
        </Text>
      )}

      {shownBlockers.length > 0 && (
        <>
          <Text color="warning" fontSize="sm" role="note">
            {t("academic.catalogStatus.blocked")}
          </Text>
          <AccessItems aria-label={t("academic.catalogStatus.blockersLabel")}>
            {shownBlockers.map((blocker) => (
              <AccessItem key={blocker}>
                <Text fontSize="sm">{blockerText(blocker)}</Text>
              </AccessItem>
            ))}
          </AccessItems>
        </>
      )}

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
