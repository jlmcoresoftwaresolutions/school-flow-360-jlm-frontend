import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Button, Icon, Text } from "@/ds-components/atoms"
import { paths } from "@/routes/paths"

import { LifecycleNoticeBox } from "../../shared/enrollments/enrollments.styles"
import { useLifecycleLabels } from "../../shared/enrollments/useLifecycleLabels"
import type { OpenLifecycleEvent } from "./useOpenLifecycleEvent"

export type LifecycleEventNoticeProps = {
  open: OpenLifecycleEvent
}

// Says, on an enrollment, that it is part of a prepared lifecycle event, with the way to it: as the origin,
// the enrollment goes on as it is until the event is confirmed (nothing is confirmed yet); as the
// destination of a transfer or a re-enrollment, the class chosen here is the one the event takes.
export const LifecycleEventNotice = (props: LifecycleEventNoticeProps) => {
  const { open } = props

  const { t } = useTranslation()
  const { typeLabel } = useLifecycleLabels()

  const type = typeLabel(open.event.eventType)

  return (
    <LifecycleNoticeBox role="note">
      <Icon color="info" name="info-outline" size={20} />
      <div>
        <Text as="p" fontSize="sm" semibold>
          {t(`lifecycle.notice.${open.role}Title`, { type })}
        </Text>
        <Text as="p" color="secondary" fontSize="sm">
          {t(`lifecycle.notice.${open.role}Description`)}
        </Text>
      </div>
      <Button
        as={Link}
        size="small"
        to={generatePath(paths.lifecycleEvent, { eventId: String(open.event.id) })}
        variant="outlined"
      >
        {t("lifecycle.openEvent")}
      </Button>
    </LifecycleNoticeBox>
  )
}
