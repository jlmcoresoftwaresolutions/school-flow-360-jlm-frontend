import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { Checkbox, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { ContractPresentation } from "@/models"
import { acceptContract, getContractPresentation } from "@/services/contracts"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { AcceptInvitationWrapper } from "../AcceptInvitation/AcceptInvitation.styles"
import { ContractText } from "../shared/contracts/contracts.styles"

// What the link leads to. checking: being read (the global Loading overlay covers the page). valid: the
// text is shown to be accepted. accepted: done. invalid: expired, revoked, replaced, already used or no
// longer the current contract (the backend never says which). unavailable: the backend couldn't be
// reached to tell.
type LinkStatus = "accepted" | "checking" | "invalid" | "unavailable" | "valid"

// Opened from the e-mail that asks a signer to accept an enrollment contract
// (/contract-acceptance?token=...&tenant=..., decided by Lucas on 24/11/2026, backend slice 3C): no login,
// both calls go to the school named in the link. The page shows the exact text and its code; opening it
// is never accepting. Accepting is the express confirmation of that version (the hash shown goes back
// with it): if the school generated a new version meanwhile, the page reads it again and asks for the
// confirmation again. The acceptance is the school's evidence (who, when, the IP and the text) and is
// never undone.
export const ContractAcceptance = () => {
  const { i18n, t } = useTranslation()
  const [searchParams] = useSearchParams()

  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking")
  const [presentation, setPresentation] = useState<ContractPresentation | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  const [notice, setNotice] = useState("")
  const [hasFailed, setHasFailed] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const token = searchParams.get("token")?.trim() ?? ""
  const tenantId = searchParams.get("tenant")?.trim() ?? ""
  const hasLinkParams = Boolean(token) && Boolean(tenantId)
  const status: LinkStatus = hasLinkParams ? linkStatus : "invalid"
  const expiresAt = presentation?.expiresAt ? new Date(presentation.expiresAt) : null

  useEffect(() => {
    if (!hasLinkParams) return

    // An answer that arrives after this effect was cleaned up (the link changed) is dropped.
    let isStale = false

    const read = async () => {
      try {
        const shown = await getContractPresentation(token, { tenantId })
        if (isStale) return
        setPresentation(shown)
        setLinkStatus("valid")
      } catch (error) {
        if (isStale) return
        const status = getErrorStatus(error)
        setLinkStatus(status === 410 || status === 404 ? "invalid" : "unavailable")
      }
    }

    void read()

    return () => {
      isStale = true
    }
  }, [hasLinkParams, reloadToken, tenantId, token])

  const retry = () => {
    setLinkStatus("checking")
    setReloadToken((current) => current + 1)
  }

  const accept = async () => {
    setHasFailed(false)
    setNotice("")
    if (!confirmed) {
      setConfirmError(t("contractAcceptance.confirmRequired"))
      return
    }
    if (!presentation) return

    setIsSending(true)
    try {
      await acceptContract(token, { confirm: true, contractHash: presentation.contentHash }, { tenantId })
      setLinkStatus("accepted")
    } catch (error) {
      switch (getErrorCode(error)) {
        case "ACCEPTANCE_CONFIRMATION_REQUIRED":
          setConfirmError(t("contractAcceptance.confirmRequired"))
          break
        case "CONTRACT_VERSION_CHANGED":
          // The school generated another version: read it and ask for the confirmation of that one.
          setConfirmed(false)
          setNotice(t("contractAcceptance.versionChanged"))
          setReloadToken((current) => current + 1)
          break
        case "ACCEPTANCE_LINK_INVALID":
          setLinkStatus("invalid")
          break
        default:
          setHasFailed(true)
      }
    } finally {
      setIsSending(false)
    }
  }

  const formatMoment = (value: Date) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeStyle: "short" }).format(value)

  const renderContent = () => {
    if (status === "invalid") {
      return (
        <StateMessage
          description={t("contractAcceptance.invalidDescription")}
          title={t("contractAcceptance.invalidTitle")}
          variant="error"
        />
      )
    }

    if (status === "unavailable") {
      return (
        <StateMessage
          action={<Button onClick={retry}>{t("common.tryAgain")}</Button>}
          description={t("contractAcceptance.unavailableDescription")}
          title={t("contractAcceptance.unavailableTitle")}
          variant="error"
        />
      )
    }

    if (status === "accepted") {
      return (
        <StateMessage
          description={t("contractAcceptance.acceptedDescription")}
          icon="check-circle-outline"
          title={t("contractAcceptance.acceptedTitle")}
        />
      )
    }

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Text as="h1" fontSize="3xl" bold>
            {t("contractAcceptance.title")}
          </Text>
          <Text as="p" color="secondary">
            {t("contractAcceptance.description", {
              signer: presentation?.signerName ?? "",
              student: presentation?.studentName ?? "",
              unit: presentation?.unitName ?? "",
            })}
          </Text>
          {expiresAt && !Number.isNaN(expiresAt.getTime()) && (
            <Text as="p" color="secondary" fontSize="sm">
              {t("contractAcceptance.validUntil", { moment: formatMoment(expiresAt) })}
            </Text>
          )}
        </div>

        {notice && (
          <Text as="p" color="warning" fontSize="sm" role="alert">
            {notice}
          </Text>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Text as="h2" fontSize="lg" semibold>
            {presentation?.title}
          </Text>
          <ContractText aria-label={t("contractAcceptance.textLabel")} role="document" tabIndex={0}>
            {presentation?.body}
          </ContractText>
          <Text color="secondary" fontSize="xs">
            {t("contractAcceptance.code", { code: presentation?.contentHash.slice(0, 12) ?? "" })}
          </Text>
        </div>

        <Text as="p" color="secondary" fontSize="sm">
          {t("contractAcceptance.openingIsNotAccepting")}
        </Text>

        <Checkbox
          checked={confirmed}
          error={confirmError}
          label={t("contractAcceptance.confirmLabel")}
          onChange={(_event, checked) => {
            setConfirmed(checked)
            setConfirmError("")
          }}
          required
        />

        {hasFailed && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {t("contractAcceptance.failed")}
          </Text>
        )}

        <span>
          <Button disabled={isSending} onClick={() => void accept()}>
            {t("contractAcceptance.submit")}
          </Button>
        </span>
      </>
    )
  }

  if (status === "checking") return <AcceptInvitationWrapper />

  return (
    <AcceptInvitationWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={11} md={10} lg={8}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              {renderContent()}
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </AcceptInvitationWrapper>
  )
}
