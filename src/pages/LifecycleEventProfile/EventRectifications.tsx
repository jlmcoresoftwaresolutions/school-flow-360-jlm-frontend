import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import type { LifecycleEvent, LifecycleReason, LifecycleRectification } from "@/models"
import { listLifecycleRectifications } from "@/services/lifecycleEvents"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PersonBlock } from "../shared/people/PersonBlock"

export type EventRectificationsProps = {
  event: LifecycleEvent
  reasons: LifecycleReason[]
  // Changes when the event is read again, so the corrections follow.
  refreshKey: string
}

type Loaded = { items: LifecycleRectification[]; key: string }

// The corrections of an event's reason or justification, each a new fact with what it was, what it became
// and why. The event keeps the original values. Shown only when there is one (a list that can't be read
// shows nothing: no correction is assumed).
export const EventRectifications = (props: EventRectificationsProps) => {
  const { event, reasons, refreshKey } = props

  const { t } = useTranslation()
  const { formatMoment } = useEnrollmentLabels()
  const { reasonLabel } = useLifecycleLabels()

  const [loaded, setLoaded] = useState<Loaded | null>(null)

  const key = `${event.id}#${refreshKey}`
  const items = loaded?.key === key ? loaded.items : []

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const read = await listLifecycleRectifications(event.id, { showLoading: false })
        if (!isStale) setLoaded({ items: read, key })
      } catch {
        if (!isStale) setLoaded({ items: [], key })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [event.id, key])

  if (items.length === 0) return null

  const valueOf = (item: LifecycleRectification, value: string | null) => {
    if (!value) return t("common.notInformed")
    return item.field === "REASON" ? reasonLabel(event.eventType, value, reasons) : value
  }

  return (
    <PersonBlock title={t("lifecycle.rectify.listTitle")}>
      <Text color="secondary" fontSize="sm">
        {t("lifecycle.rectify.listDescription")}
      </Text>
      <Table dataKey="id" value={items}>
        <Table.Column
          body={(item: LifecycleRectification) => t(`lifecycle.rectify.fields.${item.field}`)}
          field="field"
          header={t("lifecycle.rectify.field")}
        />
        <Table.Column
          body={(item: LifecycleRectification) => valueOf(item, item.oldValue)}
          field="oldValue"
          header={t("lifecycle.rectify.before")}
        />
        <Table.Column
          body={(item: LifecycleRectification) => valueOf(item, item.newValue)}
          field="newValue"
          header={t("lifecycle.rectify.after")}
        />
        <Table.Column field="reason" header={t("lifecycle.rectify.reason")} />
        <Table.Column
          body={(item: LifecycleRectification) => formatMoment(item.rectifiedAt)}
          field="rectifiedAt"
          header={t("lifecycle.rectify.when")}
        />
      </Table>
    </PersonBlock>
  )
}
