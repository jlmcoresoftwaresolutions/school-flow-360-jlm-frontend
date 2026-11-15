import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { Modal } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AuthData, SessionItem, SessionLimitChallenge } from "@/models"
import { getErrorCode, replaceSessionAtLimit } from "@/services"
import { summarizeUserAgent } from "@/utils/userAgent"

import { SessionDetails, SessionList, SessionRow } from "./Login.styles"

export type SessionLimitDialogProps = {
  challenge: SessionLimitChallenge
  onCancel: () => void
  // The challenge expired or was already used: the person has to sign in again.
  onChallengeExpired: () => void
  onSignedIn: (authData: AuthData) => void
}

type DialogProblem = "alreadyEnded" | "unavailable"

// Shown when the password was right but 5 sessions are already open (the login's 409
// SESSION_LIMIT_REACHED): no 6th session is created until the person ends one of theirs. Each session
// says where it was opened (the browser and system, from its user agent) and when; ending one signs in
// at once, in the same step. A session that was already ended elsewhere leaves the list (the challenge
// still works for another); an expired challenge (5 minutes) sends the person back to the login.
export const SessionLimitDialog = (props: SessionLimitDialogProps) => {
  const { challenge, onCancel, onChallengeExpired, onSignedIn } = props

  const { i18n, t } = useTranslation()

  const [sessions, setSessions] = useState<SessionItem[]>(challenge.sessions)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [problem, setProblem] = useState<DialogProblem | null>(null)

  const describeDevice = (session: SessionItem) => {
    const { browser, system } = summarizeUserAgent(session.userAgent)

    if (browser && system) return t("login.sessionLimit.device", { browser, system })
    return browser ?? system ?? t("login.sessionLimit.unknownDevice")
  }

  const describeStart = (session: SessionItem) => {
    const startedAt = new Date(session.createdAt)
    if (Number.isNaN(startedAt.getTime())) return undefined

    return t("login.sessionLimit.startedAt", {
      date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(startedAt),
    })
  }

  const handleEnd = async (session: SessionItem) => {
    setEndingId(session.id)
    setProblem(null)

    try {
      const authData = await replaceSessionAtLimit({ challengeToken: challenge.challengeToken, sessionId: session.id })
      onSignedIn(authData)
      return
    } catch (error) {
      const code = getErrorCode(error)

      if (code === "CHALLENGE_INVALID") {
        onChallengeExpired()
        return
      }

      if (code === "SESSION_NOT_FOUND") {
        const remaining = sessions.filter((item) => item.id !== session.id)
        // None left to end: fewer than 5 are open now, so signing in again simply works.
        if (remaining.length === 0) {
          onChallengeExpired()
          return
        }

        setSessions(remaining)
        setProblem("alreadyEnded")
      } else {
        setProblem("unavailable")
      }
    }

    setEndingId(null)
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <Button disabled={endingId !== null} onClick={onCancel} variant="outlined">
          {t("login.sessionLimit.cancel")}
        </Button>
      }
      onClose={onCancel}
      title={t("login.sessionLimit.title")}
      open
    >
      <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
        <Text as="p" color="secondary" fontSize="sm">
          {t("login.sessionLimit.description")}
        </Text>

        {problem && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {t(`login.sessionLimit.${problem}`)}
          </Text>
        )}

        <SessionList aria-label={t("login.sessionLimit.listLabel")}>
          {sessions.map((session) => {
            const device = describeDevice(session)
            const started = describeStart(session)

            return (
              <SessionRow key={session.id}>
                <SessionDetails>
                  <Text as="p" fontSize="sm" semibold>
                    {device}
                  </Text>
                  <Text as="p" color="secondary" fontSize="xs">
                    {started}
                  </Text>
                </SessionDetails>

                <Button
                  aria-label={t("login.sessionLimit.endLabel", { device: started ? `${device}, ${started}` : device })}
                  disabled={endingId !== null}
                  onClick={() => void handleEnd(session)}
                  size="small"
                >
                  {t("login.sessionLimit.end")}
                </Button>
              </SessionRow>
            )
          })}
        </SessionList>
      </div>
    </Modal>
  )
}
