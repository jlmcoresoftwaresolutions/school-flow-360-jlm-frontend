import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import type { LifecycleNotificationTemplate, LifecycleTemplateType } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { listNotificationTemplates } from "@/services/lifecyclePolicies"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
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
// plus a lock's return): published data the Admin edits, starting from the backend's proposal. The final
// wording is the school's to approve.
export const TemplatesTab = (props: TemplatesTabProps) => {
  const { isAdmin } = props

  const { t } = useTranslation()
  const { formatMoment } = useEnrollmentLabels()
  const { typeLabel } = useLifecycleLabels()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [editing, setEditing] = useState<LifecycleNotificationTemplate | null>(null)

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
          body={(item: LifecycleNotificationTemplate) => (item.updatedAt ? formatMoment(item.updatedAt) : "")}
          field="updatedAt"
          header={t("lifecyclePolicies.templates.updatedAt")}
        />
        {isAdmin && (
          <Table.Column
            align="right"
            body={(item: LifecycleNotificationTemplate) => (
              <Button
                aria-label={t("lifecyclePolicies.templates.editFor", { name: nameOf(item.eventType) })}
                onClick={() => setEditing(item)}
                size="small"
                variant="outlined"
              >
                {t("common.edit")}
              </Button>
            )}
            field="version"
            header={t("documentRequirements.actions")}
            width="1%"
          />
        )}
      </Table>

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
