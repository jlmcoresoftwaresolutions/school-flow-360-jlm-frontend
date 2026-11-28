import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import { ConfirmDialog, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { LifecycleNotificationTemplate, LifecycleTemplateType } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { listNotificationTemplates, publishNotificationTemplate } from "@/services/lifecyclePolicies"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { templateTypes } from "./lifecyclePolicies.constants"
import { TemplateModal } from "./TemplateModal"

export type TemplatesTabProps = {
  isAdmin: boolean
}

type LoadResult =
  | { error: "failed" | "forbidden"; key: number }
  | { items: LifecycleNotificationTemplate[]; key: number }

// The texts of the notifications a confirmed event sends to the signers and payers (one per event type,
// plus a lock's return): data the Admin edits, starting from the base text Lucas approved, and then
// publishes as the school's version (answer 15 of 27/11/2026). Until a text is published, the flow it
// belongs to isn't confirmed; editing it makes it a draft again.
export const TemplatesTab = (props: TemplatesTabProps) => {
  const { isAdmin } = props

  const { t } = useTranslation()
  const { formatMoment } = useEnrollmentLabels()
  const { typeLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [editing, setEditing] = useState<LifecycleNotificationTemplate | null>(null)
  const [publishing, setPublishing] = useState<LifecycleNotificationTemplate | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  const current = result?.key === reloadToken ? result : null
  const items =
    current && "items" in current
      ? [...current.items].sort((a, b) => templateTypes.indexOf(a.eventType) - templateTypes.indexOf(b.eventType))
      : []

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const read = await listNotificationTemplates({ showLoading: false })
        if (!isStale) setResult({ items: read, key: reloadToken })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  const nameOf = (type: LifecycleTemplateType) =>
    type === "LOCK_RETURN" ? t("lifecyclePolicies.templates.lockReturn") : typeLabel(type)

  const publish = async (template: LifecycleNotificationTemplate) => {
    setIsPublishing(true)
    try {
      await publishNotificationTemplate(template.eventType, template.version)
      toast.success(t("lifecyclePolicies.templates.publishedDone"))
    } catch (error) {
      if (getErrorCode(error) === "VERSION_CONFLICT") toast.error(t("lifecyclePolicies.changedMeanwhile"))
      else toast.error(toFailureMessage(t("lifecyclePolicies.failed"), error))
    } finally {
      setIsPublishing(false)
      setPublishing(null)
      reload()
    }
  }

  if (current && "error" in current) {
    return (
      <PeopleListError
        error={current.error}
        errorDescription={t("lifecyclePolicies.errorDescription")}
        errorTitle={t("lifecyclePolicies.errorTitle")}
        forbiddenDescription={t("lifecyclePolicies.forbiddenDescription")}
        forbiddenTitle={t("lifecyclePolicies.forbiddenTitle")}
        onRetry={reload}
      />
    )
  }

  return (
    <ListContent>
      <Text color="secondary" fontSize="sm">
        {t("lifecyclePolicies.templates.description")}
      </Text>
      {!isAdmin && (
        <Text color="secondary" fontSize="sm">
          {t("lifecyclePolicies.readOnly")}
        </Text>
      )}
      <Table
        dataKey="eventType"
        emptyMessage={t("lifecyclePolicies.templates.empty")}
        loading={!current}
        loadingMessage={t("lifecyclePolicies.loading")}
        value={items}
      >
        <Table.Column
          body={(item: LifecycleNotificationTemplate) => nameOf(item.eventType)}
          field="eventType"
          header={t("lifecyclePolicies.templates.notification")}
        />
        <Table.Column
          body={(item: LifecycleNotificationTemplate) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm" semibold>
                {item.subject}
              </Text>
              <Text color="secondary" fontSize="xs" style={{ whiteSpace: "pre-wrap" }}>
                {item.body}
              </Text>
            </span>
          )}
          field="subject"
          header={t("lifecyclePolicies.templates.text")}
        />
        <Table.Column
          body={(item: LifecycleNotificationTemplate) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span>
                <Badge tone={item.published ? "success" : "warning"}>
                  {item.published
                    ? t("lifecyclePolicies.templates.statusPublished")
                    : t("lifecyclePolicies.templates.statusDraft")}
                </Badge>
              </span>
              {item.published && item.publishedAt && (
                <Text color="secondary" fontSize="xs">
                  {formatMoment(item.publishedAt)}
                </Text>
              )}
            </span>
          )}
          field="published"
          header={t("documentRequirements.policies.state")}
        />
        {isAdmin && (
          <Table.Column
            align="right"
            body={(item: LifecycleNotificationTemplate) => (
              <span style={{ display: "flex", gap: spacing[8], justifyContent: "flex-end" }}>
                <Button
                  aria-label={t("lifecyclePolicies.templates.editFor", { name: nameOf(item.eventType) })}
                  onClick={() => setEditing(item)}
                  size="small"
                  variant="outlined"
                >
                  {t("common.edit")}
                </Button>
                {!item.published && (
                  <Button
                    aria-label={t("lifecyclePolicies.templates.publishFor", { name: nameOf(item.eventType) })}
                    onClick={() => setPublishing(item)}
                    size="small"
                  >
                    {t("lifecyclePolicies.publish")}
                  </Button>
                )}
              </span>
            )}
            field="version"
            header={t("documentRequirements.actions")}
            width="1%"
          />
        )}
      </Table>

      {publishing && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={t("lifecyclePolicies.publish")}
          description={t("lifecyclePolicies.templates.publishDescription")}
          loading={isPublishing}
          onClose={() => setPublishing(null)}
          onConfirm={() => void publish(publishing)}
          title={t("lifecyclePolicies.templates.publishTitle", { name: nameOf(publishing.eventType) })}
          open
        />
      )}
      {editing && (
        <TemplateModal
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
          template={editing}
          typeName={nameOf(editing.eventType)}
        />
      )}
    </ListContent>
  )
}
