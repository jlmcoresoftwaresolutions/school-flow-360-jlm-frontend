import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Switch } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleCapacityPolicy, SchoolUnit } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { getLifecycleCapacityPolicy, publishLifecycleCapacityPolicy } from "@/services/lifecycleEvents"

import { useFailureMessage } from "../../shared/people/useFailureMessage"

export type CapacityPolicyDialogProps = {
  onClose: () => void
  unit: SchoolUnit
}

type Loaded = { error: true } | { policy: LifecycleCapacityPolicy }

// Whether a unit lets transfers and re-enrollments into a full class use the capacity exception (Lucas's
// answer 4 of 26/11/2026, backend Fatia C). The Admin publishes it per unit; with it on, an Admin still
// authorizes each event on its own (one seat above the limit, 24 hours, used once, never above
// capacity + 1). Off, or never published, no event of the unit gets one. The exception of a new
// enrollment is a different one and doesn't change here. One changed meanwhile is read again.
export const CapacityPolicyDialog = (props: CapacityPolicyDialogProps) => {
  const { onClose, unit } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const policy = loaded && "policy" in loaded ? loaded.policy : null
  const chosen = enabled ?? policy?.enabled ?? false
  const isChanged = policy !== null && chosen !== policy.enabled

  useUnsavedChanges(isChanged && !isSaving)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const read = await getLifecycleCapacityPolicy(unit.id, { showLoading: false })
        if (!isStale) setLoaded({ policy: read })
      } catch {
        if (!isStale) setLoaded({ error: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken, unit.id])

  const confirm = async () => {
    if (!policy) return

    setFailure("")
    setIsSaving(true)
    try {
      await publishLifecycleCapacityPolicy({
        enabled: chosen,
        unitId: unit.id,
        ...(policy.version !== null ? { version: policy.version } : {}),
      })
      toast.success(
        chosen ? t("myOrganization.units.capacityPolicy.enabled") : t("myOrganization.units.capacityPolicy.disabled"),
      )
      onClose()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "VERSION_CONFLICT" || code === "VERSION_REQUIRED") {
        toast.error(t("myOrganization.units.capacityPolicy.changedMeanwhile"))
        setEnabled(null)
        setReloadToken((value) => value + 1)
      } else {
        setFailure(toFailureMessage(t("myOrganization.units.capacityPolicy.failed"), error))
      }
    }
  }

  const renderState = () => {
    if (!loaded) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("myOrganization.units.capacityPolicy.loading")}
        </Text>
      )
    }
    if (!policy) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("myOrganization.units.capacityPolicy.loadFailed")}
        </Text>
      )
    }
    return (
      <Switch
        checked={chosen}
        helperText={
          policy.publishedAt
            ? t("myOrganization.units.capacityPolicy.publishedHelper")
            : t("myOrganization.units.capacityPolicy.neverPublished")
        }
        label={t("myOrganization.units.capacityPolicy.label")}
        onChange={(_event, checked) => setEnabled(checked)}
      />
    )
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={!isChanged}
      confirmLabel={t("common.save")}
      description={t("myOrganization.units.capacityPolicy.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("myOrganization.units.capacityPolicy.title", { name: unit.name })}
      open
    >
      {renderState()}

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
