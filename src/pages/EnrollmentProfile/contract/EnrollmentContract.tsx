import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, type BadgeProps, Button, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { ContractAcceptance, Enrollment, EnrollmentContract as Contract } from "@/models"
import {
  generateEnrollmentContract,
  getEnrollmentContract,
  requestContractAcceptance,
  revokeContractAcceptance,
} from "@/services/contracts"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { ContractText } from "../../shared/contracts/contracts.styles"
import { CandidateHeader, PersonSections } from "../../shared/people/people.styles"
import { PersonBlock } from "../../shared/people/PersonBlock"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { AccessItem, AccessItems } from "../../shared/userAccess/userAccess.styles"

export type EnrollmentContractProps = {
  enrollment: Enrollment
  // The contract or an acceptance changed: the enrollment (its pendencies) is read again.
  onChanged: () => void
  // Changes when the enrollment is read again, so the contract follows.
  refreshKey: number
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

type LoadResult = { contract: Contract | null; key: string } | { error: "failed" | "forbidden"; key: string }

type Signer = { acceptance: ContractAcceptance | null; id: number; missing: boolean; name: string }

const acceptanceTones: Record<ContractAcceptance["status"], BadgeTone> = {
  ACCEPTED: "success",
  EXPIRED: "danger",
  PENDING: "warning",
  REVOKED: "neutral",
  SUPERSEDED: "neutral",
}

// The newest request of each signer (a resend replaces the pending one, which stays as SUPERSEDED).
const latestBySigner = (acceptances: ContractAcceptance[]) => {
  const latest = new Map<number, ContractAcceptance>()
  acceptances.forEach((acceptance) => {
    const current = latest.get(acceptance.signerId)
    if (!current || acceptance.id > current.id) latest.set(acceptance.signerId, acceptance)
  })
  return latest
}

// The contract of the enrollment (decided by Lucas on 24/11/2026, backend slice 3C), for the Admin and the
// Secretaria of the unit: generated from the approved model with what the enrollment keeps (class, start
// date and who signs), shown as the exact text, and accepted by each signer through an individual link
// sent by e-mail, valid for 24 hours. Changing the class, the start date or the signers (or approving a
// newer model) makes it outdated: it is generated again and asked again, since an old acceptance is never
// carried over. The enrollment is only confirmed once every signer accepted the current version. Without
// an approved model the contract isn't asked at all.
export const EnrollmentContract = (props: EnrollmentContractProps) => {
  const { enrollment, onChanged, refreshKey } = props

  const { i18n, t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState("")
  const [showText, setShowText] = useState(false)
  const [revoking, setRevoking] = useState<Signer | null>(null)

  const requestKey = `${enrollment.id}#${refreshKey}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  // A preparation the person operates: the server offers it the preparation's own actions.
  const canOperate = enrollment.eligibleActions.includes("ABANDON")

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const contract = await getEnrollmentContract(enrollment.id, { showLoading: false })
        if (!isStale) setResult({ contract, key: requestKey })
      } catch (error) {
        if (isStale) return
        if (getErrorCode(error) === "CONTRACT_NOT_FOUND") setResult({ contract: null, key: requestKey })
        else setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollment.id, requestKey])

  const formatMoment = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

  const afterChange = () => {
    setReloadToken((value) => value + 1)
    onChanged()
  }

  const run = async (action: () => Promise<unknown>, success: string) => {
    setFailure("")
    setIsBusy(true)
    try {
      await action()
      toast.success(success)
      afterChange()
    } catch (error) {
      switch (getErrorCode(error)) {
        case "CONTRACT_TEMPLATE_NOT_APPROVED":
          setFailure(t("enrollments.contract.noApprovedTemplate"))
          break
        case "CONTRACT_NOT_READY":
          setFailure(t("enrollments.contract.notReady"))
          break
        case "SIGNER_WITHOUT_EMAIL":
          setFailure(t("enrollments.contract.signerWithoutEmail"))
          break
        case "CONTRACT_OUTDATED":
        case "CONTRACT_NOT_GENERATED":
        case "ACCEPTANCE_NOT_PENDING":
        case "SIGNER_INVALID":
        case "ENROLLMENT_NOT_IN_PREPARATION":
          toast.error(t("enrollments.contract.changedMeanwhile"))
          afterChange()
          break
        default:
          setFailure(toFailureMessage(t("enrollments.contract.failed"), error))
      }
    } finally {
      setIsBusy(false)
    }
  }

  const generate = () => void run(() => generateEnrollmentContract(enrollment.id), t("enrollments.contract.generated"))

  const ask = (signer?: Signer) =>
    void run(
      () => requestContractAcceptance(enrollment.id, signer ? { signerId: signer.id } : {}),
      signer?.acceptance?.status === "PENDING" ? t("enrollments.contract.resent") : t("enrollments.contract.requested"),
    )

  const signersOf = (contract: Contract): Signer[] => {
    const latest = latestBySigner(contract.acceptances)
    const ids = [...new Set([...contract.missingSigners, ...latest.keys()])]
    const nameOf = (id: number) =>
      latest.get(id)?.signerName ??
      enrollment.parties.find((party) => party.guardianId === id)?.guardianName ??
      (enrollment.student.id === id ? enrollment.student.name : t("enrollments.contract.signerNumber", { id }))

    return ids.map((id) => ({
      acceptance: latest.get(id) ?? null,
      id,
      missing: contract.missingSigners.includes(id),
      name: nameOf(id),
    }))
  }

  const describe = (acceptance: ContractAcceptance | null) => {
    if (!acceptance) return t("enrollments.contract.notRequested")
    switch (acceptance.status) {
      case "ACCEPTED":
        return t("enrollments.contract.acceptedAt", {
          ip: acceptance.acceptedIp ?? "",
          moment: acceptance.acceptedAt ? formatMoment(acceptance.acceptedAt) : "",
        })
      case "PENDING":
        return acceptance.expiresAt
          ? t("enrollments.contract.pendingUntil", { moment: formatMoment(acceptance.expiresAt) })
          : t("enrollments.contract.acceptanceStatuses.PENDING")
      default:
        return t(`enrollments.contract.acceptanceDescriptions.${acceptance.status}`)
    }
  }

  const renderSigner = (signer: Signer, contract: Contract) => {
    const acceptance = signer.acceptance
    const canAsk = canOperate && !contract.outdated && signer.missing

    return (
      <AccessItem key={signer.id}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {signer.name}
          </Text>
          {acceptance ? (
            <Badge tone={acceptanceTones[acceptance.status]}>
              {t(`enrollments.contract.acceptanceStatuses.${acceptance.status}`)}
            </Badge>
          ) : (
            <Badge tone="warning">{t("enrollments.contract.notRequestedBadge")}</Badge>
          )}
        </CandidateHeader>
        <Text color="secondary" fontSize="sm">
          {[acceptance?.email, describe(acceptance)].filter(Boolean).join(" · ")}
        </Text>
        {acceptance?.status === "PENDING" && acceptance.sendResult === "FAILED" && (
          <Text color="danger" fontSize="sm">
            {t("enrollments.contract.sendFailed")}
          </Text>
        )}
        {(canAsk || (canOperate && acceptance?.status === "PENDING")) && (
          <span style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
            {canAsk && (
              <Button disabled={isBusy} onClick={() => ask(signer)} size="small" variant="outlined">
                {acceptance?.status === "PENDING" || acceptance?.status === "EXPIRED"
                  ? t("enrollments.contract.resend")
                  : t("enrollments.contract.request")}
              </Button>
            )}
            {canOperate && acceptance?.status === "PENDING" && (
              <Button disabled={isBusy} onClick={() => setRevoking(signer)} size="small" variant="outlined">
                {t("enrollments.contract.revoke")}
              </Button>
            )}
          </span>
        )}
      </AccessItem>
    )
  }

  const renderFailure = () =>
    failure && (
      <Text as="p" color="danger" fontSize="sm" role="alert">
        {failure}
      </Text>
    )

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("enrollments.contract.loading")}
      </Text>
    )
  }

  if ("error" in current) {
    return current.error === "forbidden" ? (
      <StateMessage
        description={t("enrollments.contract.forbiddenDescription")}
        icon="lock-outline"
        title={t("enrollments.contract.forbiddenTitle")}
      />
    ) : (
      <StateMessage
        action={
          <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
            {t("common.tryAgain")}
          </Button>
        }
        description={t("enrollments.contract.errorDescription")}
        title={t("enrollments.contract.errorTitle")}
        variant="error"
      />
    )
  }

  const { contract } = current

  if (!contract) {
    return (
      <PersonSections>
        <PersonBlock title={t("enrollments.contract.title")}>
          <Text color="secondary" fontSize="sm">
            {enrollment.notEvaluated.includes("CONTRACT")
              ? t("enrollments.contract.notEvaluated")
              : t("enrollments.contract.notGenerated")}
          </Text>
          {renderFailure()}
          {canOperate && (
            <span>
              <Button disabled={isBusy} onClick={generate} size="small">
                {t("enrollments.contract.generate")}
              </Button>
            </span>
          )}
        </PersonBlock>
      </PersonSections>
    )
  }

  const signers = signersOf(contract)
  const askAll = canOperate && !contract.outdated && contract.missingSigners.length > 0

  return (
    <PersonSections>
      <PersonBlock title={t("enrollments.contract.title")}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {contract.title}
          </Text>
          {contract.outdated ? (
            <Badge tone="danger">{t("enrollments.contract.outdatedBadge")}</Badge>
          ) : (
            <Badge tone="info">{t("enrollments.contract.currentBadge")}</Badge>
          )}
        </CandidateHeader>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.contract.generatedFrom", {
            hash: contract.contentHash.slice(0, 12),
            moment: formatMoment(contract.generatedAt),
            version: contract.templateVersion,
          })}
        </Text>
        {contract.outdated && (
          <Text color="danger" fontSize="sm" role="note">
            {t("enrollments.contract.outdated")}
          </Text>
        )}
        {renderFailure()}
        <span style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
          <Button onClick={() => setShowText((value) => !value)} size="small" variant="outlined">
            {showText ? t("enrollments.contract.hideText") : t("enrollments.contract.showText")}
          </Button>
          {canOperate && contract.outdated && (
            <Button disabled={isBusy} onClick={generate} size="small">
              {t("enrollments.contract.generateAgain")}
            </Button>
          )}
        </span>
        {showText && <ContractText aria-label={t("enrollments.contract.textLabel")}>{contract.body}</ContractText>}
      </PersonBlock>

      <PersonBlock title={t("enrollments.contract.signers")}>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.contract.signersDescription")}
        </Text>
        {signers.length === 0 ? (
          <Text color="secondary" fontSize="sm">
            {t("enrollments.contract.noSigners")}
          </Text>
        ) : (
          <AccessItems aria-label={t("enrollments.contract.signers")}>
            {signers.map((signer) => renderSigner(signer, contract))}
          </AccessItems>
        )}
        {askAll && (
          <span>
            <Button disabled={isBusy} onClick={() => ask()} size="small">
              {t("enrollments.contract.requestAll")}
            </Button>
          </span>
        )}
      </PersonBlock>

      {revoking?.acceptance && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={t("enrollments.contract.revoke")}
          description={t("enrollments.contract.revokeDescription")}
          loading={isBusy}
          onClose={() => setRevoking(null)}
          onConfirm={() => {
            const acceptanceId = revoking.acceptance?.id as number
            setRevoking(null)
            void run(() => revokeContractAcceptance(enrollment.id, acceptanceId), t("enrollments.contract.revoked"))
          }}
          title={t("enrollments.contract.revokeTitle", { name: revoking.name })}
          tone="danger"
          open
        />
      )}
    </PersonSections>
  )
}
