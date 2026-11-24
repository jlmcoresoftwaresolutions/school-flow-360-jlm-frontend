import { type KeyboardEvent, useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link, useNavigate } from "react-router-dom"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { useDebouncedValue } from "@/hooks"
import type { PeopleSearchItem } from "@/models"
import { paths } from "@/routes/paths"
import { listEnrollments, searchEnrollmentStudents, startEnrollment } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { preparationStatuses } from "../shared/enrollments/useEnrollmentLabels"
import { CandidateHeader, PickedPerson } from "../shared/people/people.styles"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { AccessItem, AccessItems, FormFields } from "../shared/userAccess/userAccess.styles"
import type { DirectoryUnit } from "../shared/userAccess/useUnitDirectory"

export type NewEnrollmentModalProps = {
  // The active units where the person may start a preparation.
  units: DirectoryUnit[]
  onClose: () => void
}

type SearchResult = { error: "failed" | "rateLimited"; key: string } | { items: PeopleSearchItem[]; key: string }

const minTermLength = 2
const resultsSize = 6

// The live statuses: a student has at most one of these in a unit (DP-03).
const liveStatuses = [...preparationStatuses, "ACTIVE"]

// Pressing Enter in the search field searches, never submits the dialog's form.
const keepFormClosed = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.preventDefault()
}

// Starts a preparation (JLM-339, 342): the unit (an active one where the person operates) and the student,
// chosen among the people of that unit (the student comes from Pessoas: nobody is registered here; a
// student not found is registered there first). A draft or inactive student may be prepared, but only an
// active one can be confirmed later, and the dialog says so. Starting never creates an account, a charge
// or an active enrollment. A student who already has a live enrollment in the unit (409
// ENROLLMENT_CONFLICT) isn't prepared twice: the dialog finds that enrollment and offers to open it.
export const NewEnrollmentModal = (props: NewEnrollmentModalProps) => {
  const { onClose, units } = props

  const formId = useId()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { personStatusLabel, personStatusTone } = usePeopleLabels()
  const toFailureMessage = useFailureMessage()

  const [unitId, setUnitId] = useState(units.length === 1 ? String(units[0].id) : "")
  const [term, setTerm] = useState("")
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [student, setStudent] = useState<PeopleSearchItem | null>(null)
  const [errors, setErrors] = useState<{ student?: string; unit?: string }>({})
  const [failure, setFailure] = useState("")
  const [existingId, setExistingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const debouncedTerm = useDebouncedValue(term.trim(), 400)
  const searchTerm = unitId && debouncedTerm.length >= minTermLength ? debouncedTerm : ""
  const searchKey = `${unitId}#${searchTerm}`
  const current = search && search.key === searchKey ? search : null
  const unitOptions: SelectOption[] = units.map((unit) => ({ label: unit.name, value: String(unit.id) }))

  useEffect(() => {
    if (!searchTerm) return

    let isStale = false

    const load = async () => {
      try {
        const page = await searchEnrollmentStudents(
          { page: 0, q: searchTerm, size: resultsSize, unitId: Number(unitId) },
          { showLoading: false },
        )
        if (!isStale) setSearch({ items: page.items, key: searchKey })
      } catch (loadError) {
        if (isStale) return
        const limited = getErrorStatus(loadError) === 429 || getErrorCode(loadError) === "SEARCH_RATE_LIMITED"
        setSearch({ error: limited ? "rateLimited" : "failed", key: searchKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [searchKey, searchTerm, unitId])

  // Another unit means other students: the choice made for the previous one is dropped.
  const changeUnit = (value: string) => {
    setUnitId(value)
    setStudent(null)
    setExistingId(null)
    setFailure("")
    setErrors({})
  }

  const choose = (item: PeopleSearchItem) => {
    setStudent(item)
    setTerm("")
    setExistingId(null)
    setFailure("")
    setErrors({})
  }

  // The live enrollment the student already has in the unit, found in the list (never read from the
  // backend's message).
  const findExisting = async (picked: PeopleSearchItem) => {
    try {
      const page = await listEnrollments(
        { q: picked.studentCode ?? picked.fullName, size: 20, unitId: Number(unitId) },
        { showLoading: false },
      )
      const found = page.items.find((item) => item.student.id === picked.id && liveStatuses.includes(item.status))
      setExistingId(found?.id ?? null)
    } catch {
      setExistingId(null)
    }
  }

  const submit = async () => {
    const found: typeof errors = {}
    if (!unitId) found.unit = t("enrollments.create.unitRequired")
    if (!student) found.student = t("enrollments.create.studentRequired")
    setErrors(found)
    setFailure("")
    setExistingId(null)
    if (!unitId || !student) return

    setIsSaving(true)
    try {
      const created = await startEnrollment({ studentId: student.id, unitId: Number(unitId) })
      toast.success(t("enrollments.create.done"))
      navigate(generatePath(paths.enrollmentProfile, { enrollmentId: String(created.id) }))
    } catch (error) {
      const code = getErrorCode(error)
      if (code === "ENROLLMENT_CONFLICT") {
        setFailure(t("enrollments.create.conflict"))
        await findExisting(student)
      } else if (code === "ENROLLMENT_STUDENT_NOT_FOUND") {
        setErrors({ student: t("enrollments.create.studentNotFound") })
      } else if (code === "UNIT_INACTIVE") {
        setErrors({ unit: t("enrollments.create.unitInactive") })
      } else if (getErrorStatus(error) === 403) {
        setErrors({ unit: t("enrollments.create.unitOutOfReach") })
      } else if (getErrorStatus(error) === undefined) {
        setFailure(t("enrollments.create.noAnswer"))
      } else {
        setFailure(toFailureMessage(t("enrollments.create.failed"), error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const renderStatus = (item: PeopleSearchItem) =>
    item.studentStatus && (
      <Badge tone={personStatusTone(item.studentStatus)}>{personStatusLabel(item.studentStatus)}</Badge>
    )

  const renderSearch = () => {
    if (!searchTerm) return null
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("enrollments.create.searching")}
        </Text>
      )
    }
    if ("error" in current) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {current.error === "rateLimited" ? t("people.rateLimitedDescription") : t("enrollments.create.searchFailed")}
        </Text>
      )
    }
    if (current.items.length === 0) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("enrollments.create.nobodyFound")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("enrollments.create.resultsLabel")}>
        {current.items.map((item) => (
          <AccessItem key={item.id}>
            <CandidateHeader>
              <Text fontSize="sm" semibold>
                {item.fullName}
              </Text>
              {renderStatus(item)}
            </CandidateHeader>
            {item.studentCode && (
              <Text color="secondary" fontSize="sm">
                {item.studentCode}
              </Text>
            )}
            <span>
              <Button
                aria-label={t("enrollments.create.chooseNamed", { name: item.fullName })}
                onClick={() => choose(item)}
                size="small"
                variant="outlined"
              >
                {t("enrollments.create.choose")}
              </Button>
            </span>
          </AccessItem>
        ))}
      </AccessItems>
    )
  }

  const renderStudent = () => {
    if (!student) {
      return (
        <FormFields>
          <Input
            disabled={!unitId}
            error={errors.student}
            helperText={unitId ? t("enrollments.create.studentHelper") : t("enrollments.create.unitFirst")}
            maxLength={120}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={keepFormClosed}
            placeholder={t("enrollments.create.studentPlaceholder")}
            title={t("enrollments.create.student")}
            type="search"
            value={term}
            required
          />
          {renderSearch()}
        </FormFields>
      )
    }

    const profilePath = generatePath(paths.studentProfile, { studentId: String(student.id) })

    return (
      <FormFields aria-label={t("enrollments.create.student")} role="group">
        <Text as="h3" fontSize="sm" semibold>
          {t("enrollments.create.student")}
        </Text>
        <PickedPerson>
          <span>
            <CandidateHeader>
              <Text fontSize="sm" semibold>
                {student.fullName}
              </Text>
              {renderStatus(student)}
            </CandidateHeader>
            {student.studentCode && (
              <Text color="secondary" fontSize="sm">
                {student.studentCode}
              </Text>
            )}
          </span>
          <Button onClick={() => setStudent(null)} size="small" variant="outlined">
            {t("enrollments.create.change")}
          </Button>
        </PickedPerson>
        {errors.student && (
          <Text color="danger" fontSize="sm" role="alert">
            {errors.student}
          </Text>
        )}
        {student.studentStatus !== "ACTIVE" && (
          <Text color="warning" fontSize="sm" role="note">
            {t("enrollments.create.notActiveNote")}{" "}
            <Text as={Link} color="brand" fontSize="sm" to={profilePath} semibold>
              {t("enrollments.openStudent")}
            </Text>
          </Text>
        )}
      </FormFields>
    )
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button disabled={isSaving} form={formId} type="submit">
            {t("enrollments.create.submit")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("enrollments.create.title")}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        noValidate
      >
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("enrollments.create.description")}
          </Text>

          <Select
            error={errors.unit}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeUnit(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("enrollments.create.unitPlaceholder")}
            title={t("enrollments.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
            required
          />

          {renderStudent()}

          {failure && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}
          {existingId !== null && (
            <span>
              <Button
                onClick={() => navigate(generatePath(paths.enrollmentProfile, { enrollmentId: String(existingId) }))}
                size="small"
                variant="outlined"
              >
                {t("enrollments.create.openExisting")}
              </Button>
            </span>
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
