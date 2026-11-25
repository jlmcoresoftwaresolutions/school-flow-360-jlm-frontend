import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { toast, useUnsavedChanges } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import { Checkbox, StateMessage } from "@/ds-components/molecules"
import { useSignedInUser } from "@/hooks"
import type { Enrollment, EnrollmentGuardianOption } from "@/models"
import { pageRoles } from "@/routes/access"
import { paths } from "@/routes/paths"
import { listEnrollmentGuardians, saveEnrollmentParties } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { canOpenPage } from "@/utils/access"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { CandidateHeader, PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { useRelationshipTypes } from "../shared/people/useRelationshipTypes"
import { AccessItem, AccessItems, FormFields } from "../shared/userAccess/userAccess.styles"

export type EnrollmentGuardiansProps = {
  // Grows each time the choice is asked for from elsewhere (the Preparation's "Escolher participantes"):
  // the tab then opens the choice, with the suggestions.
  chooseRequest: number
  enrollment: Enrollment
  // The enrollment was changed: read it again (the draft here is kept).
  onChanged: () => void
  onGone: () => void
}

type LoadResult = { error: true; key: string } | { key: string; options: EnrollmentGuardianOption[] }

type Choice = { chosen: boolean; financial: boolean; signatory: boolean }

const toChoices = (options: EnrollmentGuardianOption[]) =>
  Object.fromEntries(
    options.map((option) => [
      option.guardianId,
      { chosen: option.chosen, financial: option.financial, signatory: option.signatory },
    ]),
  ) as Record<number, Choice>

// What the choice opens with. Once something was chosen, exactly that. Before, a suggestion the school
// still has to check and save (decided by Lucas on 25/11/2026): every guardian with a current link takes
// part, and the one marked financial in the student's record is the financial party only when he is the
// only candidate. With more than one, the screen asks for the decision; the kinship alone never decides
// who pays or who signs, and nobody is suggested to sign.
const suggestChoices = (options: EnrollmentGuardianOption[], saved: Record<number, Choice>) => {
  if (Object.values(saved).some((choice) => choice.chosen)) return saved
  const current = options.filter((option) => option.linkStatus === "ACTIVE")
  const financialCandidates = current.filter((option) => option.financialResponsible)
  return Object.fromEntries(
    options.map((option) => [
      option.guardianId,
      {
        chosen: option.linkStatus === "ACTIVE",
        financial: financialCandidates.length === 1 && financialCandidates[0].guardianId === option.guardianId,
        signatory: false,
      },
    ]),
  ) as Record<number, Choice>
}

const sameChoices = (first: Record<number, Choice>, second: Record<number, Choice>) =>
  Object.keys(first).every((key) => {
    const one = first[Number(key)]
    const other = second[Number(key)]
    return (
      other !== undefined &&
      one.chosen === other.chosen &&
      (!one.chosen || (one.financial === other.financial && one.signatory === other.signatory))
    )
  })

// The guardians of the enrollment (JLM-345): every guardian linked to the student in Pessoas, current or
// ended, with the kinship and the responsibilities the link has there, and what was chosen for this
// enrollment - who takes part, who is financial and who signs, each an explicit choice, never taken from
// the kinship. An ended link can't be chosen, and one chosen before it ended shows so (its roles no
// longer count). A link is created or fixed in the student's record, never here. Having a linked guardian
// isn't having the enrollment's participants: the pendency asks to define them, with "Escolher
// participantes" beside it, and the first choice opens with suggestions (suggestChoices) that are only
// saved when the school saves them. The choices are edited in place and saved as a whole set with the
// `version`; a change by someone else meanwhile reads the enrollment again and keeps what was being chosen.
export const EnrollmentGuardians = (props: EnrollmentGuardiansProps) => {
  const { chooseRequest, enrollment, onChanged, onGone } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const canOpenPeople = canOpenPage(signedIn, pageRoles.students)
  const relationshipTypes = useRelationshipTypes(canOpenPeople)
  const { pendencyLabel } = useEnrollmentLabels()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [draft, setDraft] = useState<Record<number, Choice> | null>(null)
  // The last request from elsewhere already handled (opened, saved or cancelled).
  const [handledRequest, setHandledRequest] = useState(0)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const requestKey = `${enrollment.id}#${enrollment.version}#${reloadToken}`
  const current = result?.key.startsWith(`${enrollment.id}#`) ? result : null
  const options = current && "options" in current ? current.options : null
  const saved = options ? toChoices(options) : {}
  const canChoose = enrollment.eligibleActions.includes("CHOOSE_PARTIES")
  // A request from elsewhere opens the choice as soon as the guardians are read.
  const requested = chooseRequest !== handledRequest && canChoose && options !== null
  const activeDraft = draft ?? (requested && options ? suggestChoices(options, saved) : null)
  const isEditing = activeDraft !== null
  const hasChanges = isEditing && !sameChoices(activeDraft, saved)
  const hasSavedChoice = Object.values(saved).some((choice) => choice.chosen)
  const currentOptions = (options ?? []).filter((option) => option.linkStatus === "ACTIVE")
  const financialCandidates = currentOptions.filter((option) => option.financialResponsible)
  const chosenInDraft = activeDraft ? Object.values(activeDraft).filter((choice) => choice.chosen) : []
  const needsFinancial = isEditing && chosenInDraft.length > 0 && !chosenInDraft.some((choice) => choice.financial)
  const needsSignatory = isEditing && chosenInDraft.length > 0 && !chosenInDraft.some((choice) => choice.signatory)
  const studentPath = generatePath(paths.studentProfile, { studentId: String(enrollment.student.id) })
  const guardianPendencies = enrollment.pendencies.filter((pendency) => pendency.category === "GUARDIANS")

  useUnsavedChanges(hasChanges)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await listEnrollmentGuardians(enrollment.id, { showLoading: false })
        if (!isStale) setResult({ key: requestKey, options: loaded })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollment.id, requestKey])

  const relationshipLabel = (code: string) => relationshipTypes.find((type) => type.code === code)?.label

  const responsibilities = (option: EnrollmentGuardianOption) =>
    [
      option.pedagogicalResponsible && t("enrollments.guardians.pedagogical"),
      option.financialResponsible && t("enrollments.guardians.financialInPeople"),
      option.contactAuthorized && t("enrollments.guardians.contact"),
    ]
      .filter(Boolean)
      .join(", ")

  const openChoice = () => {
    if (options) setDraft(suggestChoices(options, saved))
  }

  const closeChoice = () => {
    setDraft(null)
    setHandledRequest(chooseRequest)
  }

  const change = (guardianId: number, patch: Partial<Choice>) => {
    const base = activeDraft
    setHandledRequest(chooseRequest)
    setDraft((currentDraft) => {
      const source = currentDraft ?? base
      if (!source) return currentDraft
      const next = { ...source[guardianId], ...patch }
      // Leaving the enrollment takes the roles with it.
      if (!next.chosen) Object.assign(next, { financial: false, signatory: false })
      return { ...source, [guardianId]: next }
    })
  }

  const save = async () => {
    if (!activeDraft) return
    setFailure("")
    setIsSaving(true)
    try {
      const parties = Object.entries(activeDraft)
        .filter(([, choice]) => choice.chosen)
        .map(([guardianId, choice]) => ({
          financial: choice.financial,
          guardianId: Number(guardianId),
          signatory: choice.signatory,
        }))
      await saveEnrollmentParties(enrollment.id, { parties, version: enrollment.version })
      toast.success(t("enrollments.guardians.saved"))
      closeChoice()
      onChanged()
    } catch (error) {
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT") {
        setFailure(t("enrollments.guardians.conflict"))
        onChanged()
      } else if (code === "ENROLLMENT_PARTY_INVALID") {
        setFailure(t("enrollments.guardians.partyInvalid"))
        setReloadToken((value) => value + 1)
      } else if (code === "ENROLLMENT_NOT_IN_PREPARATION") {
        toast.error(t("enrollments.notInPreparation"))
        closeChoice()
        onChanged()
      } else {
        setFailure(toFailureMessage(t("enrollments.guardians.failed"), error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const renderChoice = (option: EnrollmentGuardianOption) => {
    const ended = option.linkStatus === "ENDED"

    if (activeDraft) {
      const choice = activeDraft[option.guardianId] ?? { chosen: false, financial: false, signatory: false }
      return (
        <FormFields>
          <Checkbox
            checked={choice.chosen}
            disabled={ended && !choice.chosen}
            label={t("enrollments.guardians.choose")}
            onChange={(_event, checked) => change(option.guardianId, { chosen: checked })}
          />
          <Checkbox
            checked={choice.financial}
            disabled={!choice.chosen || ended}
            helperText={
              option.financialResponsible && !ended ? t("enrollments.guardians.financialCandidate") : undefined
            }
            label={t("enrollments.roles.financial")}
            onChange={(_event, checked) => change(option.guardianId, { financial: checked })}
          />
          <Checkbox
            checked={choice.signatory}
            disabled={!choice.chosen || ended}
            label={t("enrollments.guardians.signs")}
            onChange={(_event, checked) => change(option.guardianId, { signatory: checked })}
          />
        </FormFields>
      )
    }

    if (!option.chosen) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("enrollments.guardians.notChosen")}
        </Text>
      )
    }

    const roles = [
      option.financial && t("enrollments.roles.financial"),
      option.signatory && t("enrollments.roles.signatory"),
    ]
      .filter(Boolean)
      .join(" · ")

    return (
      <Text fontSize="sm">
        {t("enrollments.guardians.inThisEnrollment", { roles: roles || t("enrollments.roles.none") })}
      </Text>
    )
  }

  const renderOptions = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
              {t("common.tryAgain")}
            </Button>
          }
          description={t("enrollments.guardians.errorDescription")}
          title={t("enrollments.guardians.errorTitle")}
          variant="error"
        />
      )
    }
    if (!options) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("enrollments.guardians.loading")}
        </Text>
      )
    }
    if (options.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("enrollments.guardians.empty")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("enrollments.guardians.listLabel")}>
        {options.map((option) => {
          const detail = [relationshipLabel(option.relationshipCode), responsibilities(option)]
            .filter(Boolean)
            .join(" · ")
          return (
            <AccessItem key={option.guardianId}>
              <CandidateHeader>
                <Text fontSize="sm" semibold>
                  {option.guardianName}
                </Text>
                {option.linkStatus === "ENDED" ? (
                  <Badge tone="warning">{t("enrollments.preparation.linkEnded")}</Badge>
                ) : (
                  <Badge tone="success">{t("enrollments.guardians.linkActive")}</Badge>
                )}
              </CandidateHeader>
              {detail && (
                <Text color="secondary" fontSize="sm">
                  {t("enrollments.guardians.inPeople", { detail })}
                </Text>
              )}
              {renderChoice(option)}
            </AccessItem>
          )
        })}
      </AccessItems>
    )
  }

  const renderActions = () => {
    if (!canChoose || !options) return null
    if (!isEditing) {
      return (
        <Button onClick={openChoice} size="small" variant="outlined">
          {hasSavedChoice ? t("enrollments.guardians.edit") : t("enrollments.guardians.chooseParticipants")}
        </Button>
      )
    }

    return (
      <FormFields style={{ flexDirection: "row" }}>
        <Button
          disabled={isSaving}
          onClick={() => {
            closeChoice()
            setFailure("")
          }}
          size="small"
          variant="outlined"
        >
          {t("common.cancel")}
        </Button>
        <Button disabled={isSaving || !hasChanges} onClick={() => void save()} size="small">
          {t("common.save")}
        </Button>
      </FormFields>
    )
  }

  return (
    <PersonSections>
      <PersonBlock action={renderActions()} title={t("enrollments.guardians.title")}>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.guardians.description")}{" "}
          {canOpenPeople && (
            <Text as={Link} color="brand" fontSize="sm" to={studentPath} semibold>
              {t("enrollments.guardians.fixInPeople")}
            </Text>
          )}
        </Text>

        {guardianPendencies.length > 0 && !isEditing && (
          <AccessItems aria-label={t("enrollments.guardians.pendenciesLabel")}>
            {guardianPendencies.map((pendency) => (
              <AccessItem key={pendency.code}>
                <Text color="warning" fontSize="sm" semibold>
                  {pendencyLabel(pendency.code)}
                </Text>
              </AccessItem>
            ))}
            {canChoose && options && (
              <span>
                <Button onClick={openChoice} size="small">
                  {t("enrollments.guardians.chooseParticipants")}
                </Button>
              </span>
            )}
          </AccessItems>
        )}

        {isEditing && !hasSavedChoice && (
          <Text color="secondary" fontSize="sm" role="note">
            {t("enrollments.guardians.suggested")}
          </Text>
        )}

        {renderOptions()}

        {needsFinancial && (
          <Text color="warning" fontSize="sm" semibold>
            {financialCandidates.length > 1
              ? t("enrollments.guardians.manyFinancialCandidates")
              : t("enrollments.guardians.defineFinancial")}
          </Text>
        )}
        {needsSignatory && (
          <Text color="warning" fontSize="sm" semibold>
            {t("enrollments.guardians.defineSignatory")}
          </Text>
        )}

        {failure && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}
      </PersonBlock>
    </PersonSections>
  )
}
