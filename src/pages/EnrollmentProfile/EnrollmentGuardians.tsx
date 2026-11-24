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
// longer count). A link is created or fixed in the student's record, never here. The choices are edited
// in place and saved as a whole set with the `version`; a change by someone else meanwhile reads the
// enrollment again and keeps what was being chosen.
export const EnrollmentGuardians = (props: EnrollmentGuardiansProps) => {
  const { enrollment, onChanged, onGone } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const canOpenPeople = canOpenPage(signedIn, pageRoles.students)
  const relationshipTypes = useRelationshipTypes(canOpenPeople)
  const { pendencyLabel } = useEnrollmentLabels()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [draft, setDraft] = useState<Record<number, Choice> | null>(null)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const requestKey = `${enrollment.id}#${enrollment.version}#${reloadToken}`
  const current = result?.key.startsWith(`${enrollment.id}#`) ? result : null
  const options = current && "options" in current ? current.options : null
  const saved = options ? toChoices(options) : {}
  const canChoose = enrollment.eligibleActions.includes("CHOOSE_PARTIES")
  const isEditing = draft !== null
  const hasChanges = isEditing && !sameChoices(draft, saved)
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

  const change = (guardianId: number, patch: Partial<Choice>) =>
    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft
      const next = { ...currentDraft[guardianId], ...patch }
      // Leaving the enrollment takes the roles with it.
      if (!next.chosen) Object.assign(next, { financial: false, signatory: false })
      return { ...currentDraft, [guardianId]: next }
    })

  const save = async () => {
    if (!draft) return
    setFailure("")
    setIsSaving(true)
    try {
      const parties = Object.entries(draft)
        .filter(([, choice]) => choice.chosen)
        .map(([guardianId, choice]) => ({
          financial: choice.financial,
          guardianId: Number(guardianId),
          signatory: choice.signatory,
        }))
      await saveEnrollmentParties(enrollment.id, { parties, version: enrollment.version })
      toast.success(t("enrollments.guardians.saved"))
      setDraft(null)
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
        setDraft(null)
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

    if (draft) {
      const choice = draft[option.guardianId] ?? { chosen: false, financial: false, signatory: false }
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
        <Button onClick={() => setDraft(saved)} size="small" variant="outlined">
          {t("enrollments.guardians.edit")}
        </Button>
      )
    }

    return (
      <FormFields style={{ flexDirection: "row" }}>
        <Button
          disabled={isSaving}
          onClick={() => {
            setDraft(null)
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

        {guardianPendencies.length > 0 && (
          <AccessItems aria-label={t("enrollments.guardians.pendenciesLabel")}>
            {guardianPendencies.map((pendency) => (
              <AccessItem key={pendency.code}>
                <Text color="warning" fontSize="sm" semibold>
                  {pendencyLabel(pendency.code)}
                </Text>
              </AccessItem>
            ))}
          </AccessItems>
        )}

        {renderOptions()}

        {failure && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}
      </PersonBlock>
    </PersonSections>
  )
}
