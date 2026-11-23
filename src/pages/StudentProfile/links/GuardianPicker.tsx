import { type KeyboardEvent, useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Text } from "@/ds-components/atoms"
import { Collapsible, Input, Select } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { CatalogItem, GuardianSummary, PersonCandidate } from "@/models"
import { listGuardians } from "@/services/guardians"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { checkPerson } from "@/services/people"
import { isValidEmail } from "@/utils/email"

import { CandidateHeader, CandidateTags, FieldRow, PickedPerson } from "../../shared/people/people.styles"
import { personLimits } from "../../shared/people/personForm"
import { usePeopleLabels } from "../../shared/people/usePeopleLabels"
import { AccessItem, AccessItems, FormFields } from "../../shared/userAccess/userAccess.styles"
import type { PickedGuardian } from "./linkForm"

export type GuardianPickerProps = {
  documentTypes: CatalogItem[]
  // The guardians already linked (active link) to the student: offered, but not chosen again.
  linkedGuardianIds: number[]
  title: string
  value: PickedGuardian | null
  onChange: (value: PickedGuardian | null) => void
  error?: string
  helperText?: string
  required?: boolean
}

type SearchResult = { error: "failed" | "rateLimited"; term: string } | { items: GuardianSummary[]; term: string }

type CheckResult = { candidates: PersonCandidate[] } | { error: string } | null

const minTermLength = 2
const resultsSize = 6

const joinDetail = (values: (string | null | undefined)[]) => values.filter(Boolean).join(" · ")

// Pressing Enter in a search field searches, never submits the dialog's form.
const keepFormClosed = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.preventDefault()
}

// Choosing the guardian of a link or an invitation. First a search among the guardians in the operator's
// reach (name, document or e-mail; an inactive guardian or one already linked can't be chosen). A guardian
// of another unit doesn't show up there: the exact check by e-mail or document looks in every unit and,
// out of reach, gives only a partial name, masked identifiers and a proof of reuse, which is what goes to
// the backend. Nobody is ever created here: a guardian not found is registered first.
export const GuardianPicker = (props: GuardianPickerProps) => {
  const { documentTypes, error, helperText, linkedGuardianIds, onChange, required, title, value } = props

  const { t } = useTranslation()
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const messageId = useId()

  const [term, setTerm] = useState("")
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [checkEmail, setCheckEmail] = useState("")
  const [checkDocumentType, setCheckDocumentType] = useState("")
  const [checkDocumentNumber, setCheckDocumentNumber] = useState("")
  const [checkError, setCheckError] = useState("")
  const [check, setCheck] = useState<CheckResult>(null)
  const [isChecking, setIsChecking] = useState(false)

  const debouncedTerm = useDebouncedValue(term.trim(), 400)
  const searchTerm = debouncedTerm.length >= minTermLength ? debouncedTerm : ""
  const current = search && search.term === searchTerm ? search : null
  const documentOptions = documentTypes.map((type) => ({ label: type.label, value: type.code }))

  useEffect(() => {
    if (!searchTerm) return

    let isStale = false

    const load = async () => {
      try {
        const page = await listGuardians({ q: searchTerm, size: resultsSize }, { showLoading: false })
        if (!isStale) setSearch({ items: page.items, term: searchTerm })
      } catch (loadError) {
        if (isStale) return
        const limited = getErrorStatus(loadError) === 429 || getErrorCode(loadError) === "SEARCH_RATE_LIMITED"
        setSearch({ error: limited ? "rateLimited" : "failed", term: searchTerm })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [searchTerm])

  const runCheck = async () => {
    const email = checkEmail.trim()
    const documentNumber = checkDocumentNumber.trim()
    if (email && !isValidEmail(email)) {
      setCheckError(t("people.form.emailInvalid"))
      return
    }
    if (!email && !(checkDocumentType && documentNumber)) {
      setCheckError(t("guardianLinks.picker.checkRequired"))
      return
    }

    setCheckError("")
    setIsChecking(true)
    try {
      const result = await checkPerson(
        {
          documentNumber: checkDocumentType && documentNumber ? documentNumber : undefined,
          documentType: checkDocumentType && documentNumber ? checkDocumentType : undefined,
          email: email || undefined,
        },
        { showLoading: false },
      )
      setCheck({ candidates: result.candidates })
    } catch (checkFailure) {
      const limited = getErrorStatus(checkFailure) === 429 || getErrorCode(checkFailure) === "SEARCH_RATE_LIMITED"
      setCheck({ error: limited ? t("people.rateLimitedDescription") : t("guardianLinks.picker.checkFailed") })
    } finally {
      setIsChecking(false)
    }
  }

  const choose = (picked: PickedGuardian) => {
    onChange(picked)
    setTerm("")
    setCheck(null)
  }

  const renderMessage = () => {
    const message = error || helperText
    if (!message) return null

    return (
      <Text color={error ? "danger" : "secondary"} fontSize="sm" id={messageId} role={error ? "alert" : undefined}>
        {message}
      </Text>
    )
  }

  if (value) {
    return (
      <FormFields aria-label={title} role="group">
        <Text as="h3" fontSize="sm" semibold>
          {title}
        </Text>
        <PickedPerson>
          <span>
            <Text fontSize="sm" semibold>
              {value.name}
            </Text>
            {value.detail && (
              <Text color="secondary" fontSize="sm">
                {value.detail}
              </Text>
            )}
          </span>
          <Button onClick={() => onChange(null)} size="small" variant="outlined">
            {t("guardianLinks.picker.change")}
          </Button>
        </PickedPerson>
        {renderMessage()}
      </FormFields>
    )
  }

  const renderGuardian = (guardian: GuardianSummary) => {
    const isLinked = linkedGuardianIds.includes(guardian.id)
    const isInactive = guardian.status === "INACTIVE"
    const detail = joinDetail([guardian.maskedDocument, guardian.maskedEmail])

    return (
      <AccessItem key={guardian.id}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {guardian.fullName}
          </Text>
          {guardian.status !== "ACTIVE" && (
            <Badge tone={personStatusTone(guardian.status)}>{personStatusLabel(guardian.status)}</Badge>
          )}
        </CandidateHeader>
        {detail && (
          <Text color="secondary" fontSize="sm">
            {detail}
          </Text>
        )}
        {isLinked && (
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.picker.alreadyLinked")}
          </Text>
        )}
        {isInactive && (
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.errors.guardianInactive")}
          </Text>
        )}
        {!isLinked && !isInactive && (
          <span>
            <Button
              aria-label={t("guardianLinks.picker.chooseNamed", { name: guardian.fullName })}
              onClick={() => choose({ detail, guardianId: guardian.id, name: guardian.fullName })}
              size="small"
              variant="outlined"
            >
              {t("guardianLinks.picker.choose")}
            </Button>
          </span>
        )}
      </AccessItem>
    )
  }

  const renderSearch = () => {
    if (!searchTerm) return null
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("guardianLinks.picker.searching")}
        </Text>
      )
    }
    if ("error" in current) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {current.error === "rateLimited"
            ? t("people.rateLimitedDescription")
            : t("guardianLinks.picker.searchFailed")}
        </Text>
      )
    }
    if (current.items.length === 0) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("guardianLinks.picker.nobodyFound")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("guardianLinks.picker.resultsLabel")}>{current.items.map(renderGuardian)}</AccessItems>
    )
  }

  const renderCandidate = (candidate: PersonCandidate) => {
    const isGuardian = candidate.types.includes("GUARDIAN")
    const isLinked = candidate.id !== null && linkedGuardianIds.includes(candidate.id)
    const name = (candidate.inScope ? candidate.fullName : candidate.partialName) ?? ""
    const detail = joinDetail([candidate.maskedDocument, candidate.maskedEmail])
    const picked: PickedGuardian =
      candidate.inScope && candidate.id !== null
        ? { detail, guardianId: candidate.id, name }
        : { detail, name, reuseRef: candidate.ref }

    return (
      <AccessItem key={candidate.ref}>
        <CandidateHeader>
          <Text fontSize="sm" semibold>
            {name}
          </Text>
          <CandidateTags>
            {candidate.types.map((type) => (
              <Badge key={type} tone="neutral">
                {t(`peopleSearch.types.${type}`)}
              </Badge>
            ))}
          </CandidateTags>
        </CandidateHeader>
        {detail && (
          <Text color="secondary" fontSize="sm">
            {detail}
          </Text>
        )}
        {!candidate.inScope && (
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.picker.otherUnit")}
          </Text>
        )}
        {!isGuardian && (
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.picker.notGuardian")}
          </Text>
        )}
        {isLinked && (
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.picker.alreadyLinked")}
          </Text>
        )}
        {isGuardian && !isLinked && (
          <span>
            <Button
              aria-label={t("guardianLinks.picker.chooseNamed", { name })}
              onClick={() => choose(picked)}
              size="small"
              variant="outlined"
            >
              {t("guardianLinks.picker.choose")}
            </Button>
          </span>
        )}
      </AccessItem>
    )
  }

  const renderCheck = () => {
    if (!check) return null
    if ("error" in check) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {check.error}
        </Text>
      )
    }
    if (check.candidates.length === 0) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("guardianLinks.picker.checkNobody")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("guardianLinks.picker.checkResultsLabel")}>
        {check.candidates.map(renderCandidate)}
      </AccessItems>
    )
  }

  return (
    <FormFields aria-label={title} role="group">
      <Input
        aria-describedby={error || helperText ? messageId : undefined}
        invalid={Boolean(error)}
        maxLength={personLimits.fullName}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={keepFormClosed}
        placeholder={t("guardianLinks.picker.searchPlaceholder")}
        required={required}
        title={title}
        type="search"
        value={term}
      />
      {renderMessage()}
      {renderSearch()}

      <Collapsible>
        <Collapsible.Trigger>{t("guardianLinks.picker.checkTitle")}</Collapsible.Trigger>
        <Collapsible.Content>
          <FormFields style={{ paddingTop: spacing[12] }}>
            <Text color="secondary" fontSize="sm">
              {t("guardianLinks.picker.checkDescription")}
            </Text>
            <Input
              error={checkError}
              maxLength={personLimits.contactEmail}
              onChange={(event) => setCheckEmail(event.target.value)}
              onKeyDown={keepFormClosed}
              placeholder={t("people.form.contactEmailPlaceholder")}
              title={t("guardianLinks.picker.checkEmail")}
              type="email"
              value={checkEmail}
            />
            <FieldRow>
              <Select
                noOptionsMessage={t("common.noOptions")}
                onChange={(option) => setCheckDocumentType(option?.value ?? "")}
                options={documentOptions}
                placeholder={t("people.form.documentTypePlaceholder")}
                title={t("people.form.documentTypeLabel")}
                value={documentOptions.find((option) => option.value === checkDocumentType) ?? null}
              />
              <Input
                maxLength={personLimits.documentNumber}
                onChange={(event) => setCheckDocumentNumber(event.target.value)}
                onKeyDown={keepFormClosed}
                placeholder={t("people.form.documentNumberPlaceholder")}
                title={t("people.form.documentNumberLabel")}
                value={checkDocumentNumber}
              />
            </FieldRow>
            <span>
              <Button disabled={isChecking} onClick={() => void runCheck()} size="small" variant="outlined">
                {t("guardianLinks.picker.check")}
              </Button>
            </span>
            {renderCheck()}
          </FormFields>
        </Collapsible.Content>
      </Collapsible>
    </FormFields>
  )
}
