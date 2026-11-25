import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, type BadgeProps, Button, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type {
  EnrollmentDocumentChecklist,
  EnrollmentDocumentException,
  EnrollmentDocumentItem,
  EnrollmentDocumentStatus,
  EnrollmentExceptionStatus,
} from "@/models"
import {
  getEnrollmentDocumentDownload,
  getEnrollmentDocuments,
  listEnrollmentExceptions,
} from "@/services/enrollmentDocuments"
import { getErrorStatus } from "@/services/httpClient"
import { hasAnyRole } from "@/utils/access"
import { formatDate } from "@/utils/dates"

import { CandidateHeader, PersonSections } from "../../shared/people/people.styles"
import { PersonBlock } from "../../shared/people/PersonBlock"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { AccessItem, AccessItems } from "../../shared/userAccess/userAccess.styles"
import { DecideExceptionDialog } from "./DecideExceptionDialog"
import { RequestExceptionDialog } from "./RequestExceptionDialog"
import { ReviewDocumentDialog } from "./ReviewDocumentDialog"
import { UploadEnrollmentDocumentModal } from "./UploadEnrollmentDocumentModal"

export type EnrollmentDocumentsProps = {
  enrollmentId: number
  // A document or an exception changed: the enrollment (its pendencies) is read again.
  onChanged: () => void
  // Changes when the enrollment is read again, so the checklist follows.
  refreshKey: number
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

type LoadResult =
  | { checklist: EnrollmentDocumentChecklist; exceptions: EnrollmentDocumentException[]; key: string }
  | { error: "failed" | "forbidden"; key: string }

type Dialog =
  | { item: EnrollmentDocumentItem; kind: "approve" | "exception" | "reject" | "upload" }
  | { decision: "APPROVE" | "DENY"; exception: EnrollmentDocumentException; kind: "decide"; label: string }
  | null

const statusTones: Record<EnrollmentDocumentStatus, BadgeTone> = {
  APPROVED: "success",
  EXCEPTED: "info",
  EXPIRED: "danger",
  PENDING: "warning",
  RECEIVED: "info",
  REJECTED: "danger",
}

const exceptionTones: Record<EnrollmentExceptionStatus, BadgeTone> = {
  APPROVED: "success",
  DENIED: "neutral",
  REQUESTED: "warning",
}

// The documents of the enrollment (decided by Lucas on 24/11/2026, backend slice 3B): one line per
// requirement the school published for this unit, stage and kind, and per person (the student, or each
// signatory). Each line shows its status, validity and file, and offers only what the server allows: send
// the file, check it (approve or reject with a reason), download it through a 5-minute link, or ask for an
// exception. An exception never makes a line look delivered. Only the Admin decides an exception, and never
// the person who asked. Only the Admin and the Secretaria of the unit see this; nothing is universal: a
// school that published nothing asks for nothing.
export const EnrollmentDocuments = (props: EnrollmentDocumentsProps) => {
  const { enrollmentId, onChanged, refreshKey } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${enrollmentId}#${refreshKey}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const [checklist, exceptions] = await Promise.all([
          getEnrollmentDocuments(enrollmentId, { showLoading: false }),
          listEnrollmentExceptions(enrollmentId, { showLoading: false }),
        ])
        if (!isStale) setResult({ checklist, exceptions, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId, requestKey])

  const afterChange = () => {
    setDialog(null)
    setReloadToken((value) => value + 1)
    onChanged()
  }

  const download = async (item: EnrollmentDocumentItem) => {
    try {
      const link = await getEnrollmentDocumentDownload(enrollmentId, item.itemId as number)
      window.open(link.url, "_blank", "noopener")
    } catch (error) {
      toast.error(toFailureMessage(t("enrollments.documents.downloadFailed"), error))
    }
  }

  const itemActions = (item: EnrollmentDocumentItem): ActionMenuItem[] => {
    const actions: ActionMenuItem[] = []
    if (item.eligibleActions.includes("UPLOAD")) {
      actions.push({
        icon: "download-outline",
        key: "upload",
        label: item.document ? t("enrollments.documents.replace") : t("enrollments.documents.upload"),
        onClick: () => setDialog({ item, kind: "upload" }),
      })
    }
    if (item.eligibleActions.includes("DOWNLOAD")) {
      actions.push({
        icon: "file-outline",
        key: "download",
        label: t("enrollments.documents.download"),
        onClick: () => void download(item),
      })
    }
    if (item.eligibleActions.includes("APPROVE")) {
      actions.push({
        icon: "check-circle-outline",
        key: "approve",
        label: t("enrollments.documents.approve"),
        onClick: () => setDialog({ item, kind: "approve" }),
      })
    }
    if (item.eligibleActions.includes("REJECT")) {
      actions.push({
        icon: "x-circle-outline",
        key: "reject",
        label: t("enrollments.documents.reject"),
        onClick: () => setDialog({ item, kind: "reject" }),
        tone: "danger",
      })
    }
    if (item.eligibleActions.includes("REQUEST_EXCEPTION")) {
      actions.push({
        icon: "shield-outline",
        key: "exception",
        label: t("enrollments.exceptions.request"),
        onClick: () => setDialog({ item, kind: "exception" }),
      })
    }
    return actions
  }

  const itemDetails = (item: EnrollmentDocumentItem) =>
    [
      item.mandatory ? t("enrollments.documents.mandatory") : t("enrollments.documents.optional"),
      item.document?.fileName,
      item.validUntil && t("enrollments.documents.validUntil", { date: formatDate(item.validUntil) }),
    ]
      .filter(Boolean)
      .join(" · ")

  const renderItem = (item: EnrollmentDocumentItem) => {
    const actions = itemActions(item)
    const label = item.personName ? `${item.label} · ${item.personName}` : item.label

    return (
      <AccessItem key={`${item.requirementId}-${item.personId ?? "student"}`}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {label}
          </Text>
          <Badge tone={statusTones[item.status]}>{t(`enrollments.documents.statuses.${item.status}`)}</Badge>
          {item.blocking && <Badge tone="warning">{t("enrollments.documents.blocking")}</Badge>}
          {actions.length > 0 && (
            <span style={{ marginLeft: "auto" }}>
              <ActionMenu
                items={actions}
                size="small"
                triggerLabel={t("enrollments.documents.actionsFor", { name: label })}
              />
            </span>
          )}
        </CandidateHeader>
        <Text color="secondary" fontSize="sm">
          {itemDetails(item)}
        </Text>
        {item.status === "REJECTED" && item.rejectReason && (
          <Text color="danger" fontSize="sm">
            {t("enrollments.documents.rejectedBecause", { reason: item.rejectReason })}
          </Text>
        )}
        {item.exception && (
          <Text color="secondary" fontSize="sm">
            {t(`enrollments.exceptions.lineStatuses.${item.exception.status}`)}
            {item.exception.dueDate &&
              ` · ${t("enrollments.exceptions.until", { date: formatDate(item.exception.dueDate) })}`}
          </Text>
        )}
      </AccessItem>
    )
  }

  const renderException = (exception: EnrollmentDocumentException, checklist: EnrollmentDocumentChecklist) => {
    const requirement = checklist.items.find((item) => item.requirementId === exception.requirementId)
    const label = [requirement?.label ?? exception.requirementCode, exception.personName].filter(Boolean).join(" · ")
    // Only the Admin decides, and never the person who asked (the backend refuses it too).
    const canDecide = exception.status === "REQUESTED" && isAdmin && signedIn?.userId !== exception.requestedBy

    return (
      <AccessItem key={exception.id}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {label}
          </Text>
          <Badge tone={exceptionTones[exception.status]}>
            {t(`enrollments.exceptions.statuses.${exception.status}`)}
          </Badge>
          {exception.overdue && <Badge tone="danger">{t("enrollments.exceptions.overdue")}</Badge>}
        </CandidateHeader>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.exceptions.requestedReason", { reason: exception.reason })}
        </Text>
        {exception.decisionReason && (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.exceptions.decidedReason", { reason: exception.decisionReason })}
          </Text>
        )}
        {exception.dueDate && (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.exceptions.until", { date: formatDate(exception.dueDate) })}
          </Text>
        )}
        {exception.status === "REQUESTED" && !canDecide && (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.exceptions.waitingAdmin")}
          </Text>
        )}
        {canDecide && (
          <span style={{ display: "flex", gap: spacing[8] }}>
            <Button
              onClick={() => setDialog({ decision: "DENY", exception, kind: "decide", label })}
              size="small"
              variant="outlined"
            >
              {t("enrollments.exceptions.deny")}
            </Button>
            <Button onClick={() => setDialog({ decision: "APPROVE", exception, kind: "decide", label })} size="small">
              {t("enrollments.exceptions.approve")}
            </Button>
          </span>
        )}
      </AccessItem>
    )
  }

  const renderDialog = () => {
    if (!dialog) return null
    if (dialog.kind === "decide") {
      return (
        <DecideExceptionDialog
          decision={dialog.decision}
          enrollmentId={enrollmentId}
          exception={dialog.exception}
          label={dialog.label}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
        />
      )
    }
    if (dialog.kind === "upload") {
      return (
        <UploadEnrollmentDocumentModal
          enrollmentId={enrollmentId}
          item={dialog.item}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
        />
      )
    }
    if (dialog.kind === "exception") {
      return (
        <RequestExceptionDialog
          enrollmentId={enrollmentId}
          item={dialog.item}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
        />
      )
    }
    return (
      <ReviewDocumentDialog
        decision={dialog.kind === "approve" ? "APPROVE" : "REJECT"}
        enrollmentId={enrollmentId}
        item={dialog.item}
        onChanged={afterChange}
        onClose={() => setDialog(null)}
      />
    )
  }

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("enrollments.documents.loading")}
      </Text>
    )
  }

  if ("error" in current) {
    return current.error === "forbidden" ? (
      <StateMessage
        description={t("enrollments.documents.forbiddenDescription")}
        icon="lock-outline"
        title={t("enrollments.documents.forbiddenTitle")}
      />
    ) : (
      <StateMessage
        action={
          <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
            {t("common.tryAgain")}
          </Button>
        }
        description={t("enrollments.documents.errorDescription")}
        title={t("enrollments.documents.errorTitle")}
        variant="error"
      />
    )
  }

  const { checklist, exceptions } = current

  return (
    <PersonSections>
      <PersonBlock title={t("enrollments.documents.title")}>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.documents.description")}
        </Text>
        {!checklist.published || checklist.items.length === 0 ? (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.documents.notPublished")}
          </Text>
        ) : (
          <AccessItems aria-label={t("enrollments.documents.title")}>{checklist.items.map(renderItem)}</AccessItems>
        )}
      </PersonBlock>

      {exceptions.length > 0 && (
        <PersonBlock title={t("enrollments.exceptions.title")}>
          <AccessItems aria-label={t("enrollments.exceptions.title")}>
            {exceptions.map((exception) => renderException(exception, checklist))}
          </AccessItems>
        </PersonBlock>
      )}

      {renderDialog()}
    </PersonSections>
  )
}
