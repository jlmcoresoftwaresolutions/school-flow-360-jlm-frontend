import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, type BadgeProps, Button, Text } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import { useSignedInUser } from "@/hooks"
import type { LifecycleCapacityAuthorization, LifecycleCapacityAuthorizationStatus, LifecycleEvent } from "@/models"
import { getLifecycleCapacityAuthorization, getLifecycleCapacityPolicy } from "@/services/lifecycleEvents"
import { hasAnyRole } from "@/utils/access"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { PersonBlock } from "../shared/people/PersonBlock"
import { AuthorizeCapacityDialog } from "./AuthorizeCapacityDialog"

export type EventCapacityProps = {
  event: LifecycleEvent
  // An authorization was given (or refused because the event changed): read the event again.
  onChanged: () => void
  // Changes when the event is read again, so the authorization follows.
  refreshKey: string
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

// `undefined` while reading; `null` when there is none (or it couldn't be read: nothing is assumed).
type Loaded = { authorization: LifecycleCapacityAuthorization | null; enabled: boolean | null; key: string }

const statusTones: Record<LifecycleCapacityAuthorizationStatus, BadgeTone> = {
  AVAILABLE: "success",
  CONSUMED: "neutral",
  EXPIRED: "danger",
}

// The capacity exception of a transfer or a re-enrollment into a full class (Lucas's answer 4 of
// 26/11/2026): shown when the destination class has no seat, or once the event has its authorization.
// It says whether the destination unit enabled the exception, and the Admin may authorize one seat above
// the limit for this event (valid 24 hours, used once by the confirmation, never above capacity + 1).
// An expired one isn't renewed: the event is given up and prepared again.
export const EventCapacity = (props: EventCapacityProps) => {
  const { event, onChanged, refreshKey } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { formatMoment } = useEnrollmentLabels()

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const isFull = event.blockers.some((blocker) => blocker.code === "DESTINATION_FULL")
  const takesSeat = event.eventType === "TRANSFER" || event.eventType === "REENROLLMENT"
  const unitId = event.destinationUnitId
  const key = `${event.id}#${refreshKey}`
  const current = loaded?.key === key ? loaded : null

  useEffect(() => {
    if (!takesSeat) return

    let isStale = false

    const load = async () => {
      const [authorization, enabled] = await Promise.all([
        (async () => {
          try {
            return await getLifecycleCapacityAuthorization(event.id, { showLoading: false })
          } catch {
            // None was given (404 CAPACITY_EXCEPTION_NOT_FOUND), or it couldn't be read: none is shown.
            return null
          }
        })(),
        (async () => {
          if (unitId === null) return null
          try {
            return (await getLifecycleCapacityPolicy(unitId, { showLoading: false })).enabled
          } catch {
            return null
          }
        })(),
      ])
      if (!isStale) setLoaded({ authorization, enabled, key })
    }

    void load()

    return () => {
      isStale = true
    }
  }, [event.id, key, takesSeat, unitId])

  const authorization = current?.authorization ?? null
  if (!takesSeat || !current || (!authorization && !(isFull && event.status === "PREPARED"))) return null

  const renderContent = () => {
    if (authorization) {
      return (
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "status",
              label: t("lifecycle.capacity.status"),
              value: (
                <Badge tone={statusTones[authorization.status] ?? "neutral"}>
                  {t(`lifecycle.capacity.statuses.${authorization.status}`)}
                </Badge>
              ),
            },
            {
              key: "authorizedAt",
              label: t("lifecycle.capacity.authorizedAt"),
              value: formatMoment(authorization.authorizedAt),
            },
            {
              key: "expiresAt",
              label: t("lifecycle.capacity.expiresAt"),
              value: formatMoment(authorization.expiresAt),
            },
            { fullWidth: true, key: "reason", label: t("lifecycle.capacity.reason"), value: authorization.reason },
          ]}
        />
      )
    }

    return (
      <>
        <Text color="secondary" fontSize="sm">
          {t("lifecycle.capacity.fullDescription")}
        </Text>
        {current?.enabled === false && (
          <Text color="secondary" fontSize="sm" role="note">
            {t("lifecycle.capacity.notEnabled")}
          </Text>
        )}
        {isAdmin && current?.enabled && (
          <span>
            <Button onClick={() => setIsAuthorizing(true)} size="small">
              {t("lifecycle.capacity.authorize")}
            </Button>
          </span>
        )}
      </>
    )
  }

  return (
    <PersonBlock title={t("lifecycle.capacity.title")}>
      {renderContent()}
      {authorization?.status === "EXPIRED" && event.status === "PREPARED" && (
        <Text color="secondary" fontSize="sm">
          {t("lifecycle.capacity.expiredHelp")}
        </Text>
      )}
      {isAuthorizing && (
        <AuthorizeCapacityDialog
          event={event}
          onChanged={() => {
            setIsAuthorizing(false)
            onChanged()
          }}
          onClose={() => setIsAuthorizing(false)}
        />
      )}
    </PersonBlock>
  )
}
