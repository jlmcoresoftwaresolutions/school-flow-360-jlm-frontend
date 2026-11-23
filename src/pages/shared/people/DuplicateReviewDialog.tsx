import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { DuplicateReview, DuplicateReviewKind, PersonCandidate, PersonSignals } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { decideDuplicateReview, openDuplicateReview } from "@/services/people"

import { AccessItem, AccessItems, FormFields } from "../userAccess/userAccess.styles"
import { CandidateHeader, CandidateTags } from "./people.styles"

export type DuplicateReviewDialogProps = {
  kind: DuplicateReviewKind
  signals: PersonSignals
  onClose: () => void
  // An existing person of the same kind, in the operator's reach, is the one being registered: open it.
  onOpenExisting: (personId: number) => void
  // The operator kept the new person apart (`reviewId`), or nobody matches anymore (null): save again.
  onResolved: (reviewId: number | null) => void
}

const justificationMin = 10
const justificationMax = 500

// A possible duplicate found when saving a person (P03-S09): the backend refused the save until the
// operator reviews who matched. The review is opened for the same data the form was saving; each
// candidate shows only what the operator may see (a person out of reach: a partial name and masked
// identifiers, never opened), with why it matched. Nothing is ever merged: the operator opens the
// existing record (the decision is recorded) or keeps the new one apart - with a justification for a
// strong match - and saves again with the review. Closing goes back to the form, the draft kept.
export const DuplicateReviewDialog = (props: DuplicateReviewDialogProps) => {
  const { kind, onClose, onOpenExisting, onResolved, signals } = props

  const { t } = useTranslation()

  const [review, setReview] = useState<DuplicateReview | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [justification, setJustification] = useState("")
  const [justificationError, setJustificationError] = useState("")
  const [failure, setFailure] = useState("")
  const [keepBlocked, setKeepBlocked] = useState(false)
  const [isDeciding, setIsDeciding] = useState(false)
  const [nobodyLeft, setNobodyLeft] = useState(false)

  useEffect(() => {
    let isStale = false

    const open = async () => {
      try {
        const opened = await openDuplicateReview({ kind, signals })
        if (isStale) return
        // Nobody matches anymore: nothing to review, the save can go on.
        if (opened.reviewId === null) setNobodyLeft(true)
        else setReview(opened)
      } catch (error) {
        if (!isStale) {
          setFailure(getErrorStatus(error) === 429 ? t("people.rateLimitedDescription") : t("people.duplicates.failed"))
        }
      }
    }

    void open()

    return () => {
      isStale = true
    }
  }, [kind, reloadToken, signals, t])

  useEffect(() => {
    if (nobodyLeft) onResolved(null)
  }, [nobodyLeft, onResolved])

  const isStrong = review?.strength === "STRONG"

  // A refused decision: the review went stale or was decided meanwhile (it is opened again), an equal
  // document (can't be kept apart), or a missing justification.
  const handleDecisionError = (error: unknown) => {
    const code = getErrorCode(error)
    if (code === "DUPLICATE_REVIEW_STALE" || code === "DUPLICATE_REVIEW_RESOLVED") {
      setReview(null)
      setFailure(t("people.duplicates.stale"))
      setReloadToken((current) => current + 1)
    } else if (code === "STRONG_IDENTIFIER_UNIQUE") {
      setKeepBlocked(true)
      setFailure(t("people.duplicates.documentBlocks"))
    } else if (code === "JUSTIFICATION_REQUIRED") {
      setJustificationError(t("people.duplicates.justificationRequired", { min: justificationMin }))
    } else {
      setFailure(t("people.duplicates.failed"))
    }
  }

  const openExisting = async (candidate: PersonCandidate) => {
    if (!review?.reviewId || candidate.id === null) return

    setIsDeciding(true)
    setFailure("")
    try {
      await decideDuplicateReview(review.reviewId, { candidateRef: candidate.ref, decision: "REUSE", signals })
      onOpenExisting(candidate.id)
    } catch (error) {
      handleDecisionError(error)
    } finally {
      setIsDeciding(false)
    }
  }

  const keepSeparate = async () => {
    if (!review?.reviewId) return
    if (isStrong && justification.trim().length < justificationMin) {
      setJustificationError(t("people.duplicates.justificationRequired", { min: justificationMin }))
      return
    }

    setIsDeciding(true)
    setFailure("")
    setJustificationError("")
    try {
      await decideDuplicateReview(review.reviewId, {
        decision: "KEEP_SEPARATE",
        justification: justification.trim() || undefined,
        signals,
      })
      onResolved(review.reviewId)
    } catch (error) {
      handleDecisionError(error)
    } finally {
      setIsDeciding(false)
    }
  }

  const renderCandidate = (candidate: PersonCandidate) => (
    <AccessItem key={candidate.ref}>
      <CandidateHeader>
        <Text fontSize="sm" semibold>
          {candidate.inScope ? candidate.fullName : candidate.partialName}
        </Text>
        <CandidateTags>
          {candidate.types.map((type) => (
            <Badge key={type} tone="neutral">
              {t(`peopleSearch.types.${type}`)}
            </Badge>
          ))}
          <Badge tone={candidate.strong ? "danger" : "warning"}>
            {candidate.strong ? t("people.duplicates.strong") : t("people.duplicates.weak")}
          </Badge>
        </CandidateTags>
      </CandidateHeader>
      <Text color="secondary" fontSize="sm">
        {candidate.signals.map((signal) => t(`people.duplicates.signals.${signal}`)).join(", ")}
      </Text>
      {(candidate.maskedDocument || candidate.maskedEmail) && (
        <Text color="secondary" fontSize="sm">
          {[candidate.maskedDocument, candidate.maskedEmail].filter(Boolean).join(" · ")}
        </Text>
      )}
      {candidate.inScope && candidate.types.includes(kind) && (
        <span>
          <Button disabled={isDeciding} onClick={() => void openExisting(candidate)} size="small" variant="outlined">
            {t("people.duplicates.openExisting")}
          </Button>
        </span>
      )}
      {!candidate.inScope && (
        <Text color="secondary" fontSize="sm">
          {t("people.duplicates.outOfReach")}
        </Text>
      )}
    </AccessItem>
  )

  return (
    <Modal
      closeLabel={t("common.close")}
      footer={
        <>
          <Button disabled={isDeciding} onClick={onClose} variant="outlined">
            {t("people.duplicates.back")}
          </Button>
          <Button disabled={!review || keepBlocked || isDeciding} onClick={() => void keepSeparate()}>
            {t("people.duplicates.keepSeparate")}
          </Button>
        </>
      }
      onClose={isDeciding ? () => undefined : onClose}
      size="lg"
      title={t("people.duplicates.title")}
      open
    >
      <FormFields>
        <Text color="secondary" fontSize="sm">
          {t("people.duplicates.description")}
        </Text>

        {failure && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}

        {review && <AccessItems>{review.candidates.map(renderCandidate)}</AccessItems>}

        {review && !keepBlocked && (
          <Textarea
            error={justificationError}
            helperText={
              isStrong
                ? t("people.duplicates.justificationStrong", { min: justificationMin })
                : t("people.duplicates.justificationWeak")
            }
            maxLength={justificationMax}
            onChange={(event) => setJustification(event.target.value)}
            placeholder={t("people.duplicates.justificationPlaceholder")}
            required={isStrong}
            title={t("people.duplicates.justificationLabel")}
            value={justification}
          />
        )}
      </FormFields>
    </Modal>
  )
}
