import { type KeyboardEvent, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { useDebouncedValue } from "@/hooks"
import type { AcademicTeacher } from "@/models"
import { searchAcademicTeachers } from "@/services/academicClasses"

import { PickedPerson } from "../../shared/people/people.styles"
import { AccessItem, AccessItems, FormFields } from "../../shared/userAccess/userAccess.styles"

export type TeacherPickerProps = {
  title: string
  unitId: number
  value: AcademicTeacher | null
  onChange: (value: AcademicTeacher | null) => void
  error?: string
}

type SearchResult = { error: true; term: string } | { items: AcademicTeacher[]; term: string }

const minTermLength = 2

// Pressing Enter in the search field searches, never submits the dialog's form.
const keepFormClosed = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.preventDefault()
}

// Choosing the teacher of a link: a search (from two letters) among the active Professors of the class's
// unit, people of Usuários with or without a login. The backend gives only the name, so a homonym is told
// apart by its number; linking never creates an account, a password nor an e-mail.
export const TeacherPicker = (props: TeacherPickerProps) => {
  const { error, onChange, title, unitId, value } = props

  const { t } = useTranslation()

  const [term, setTerm] = useState("")
  const [search, setSearch] = useState<SearchResult | null>(null)

  const debouncedTerm = useDebouncedValue(term.trim(), 400)
  const searchTerm = debouncedTerm.length >= minTermLength ? debouncedTerm : ""
  const current = search && search.term === searchTerm ? search : null

  useEffect(() => {
    if (!searchTerm) return

    let isStale = false

    const load = async () => {
      try {
        const items = await searchAcademicTeachers({ q: searchTerm, unitId }, { showLoading: false })
        if (!isStale) setSearch({ items, term: searchTerm })
      } catch {
        if (!isStale) setSearch({ error: true, term: searchTerm })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [searchTerm, unitId])

  if (value) {
    return (
      <FormFields aria-label={title} role="group">
        <Text as="h3" fontSize="sm" semibold>
          {title}
        </Text>
        <PickedPerson>
          <span>
            <Text fontSize="sm" semibold>
              {value.fullName}
            </Text>
            <Text color="secondary" fontSize="sm">
              {value.hasAccess ? t("classTeachers.picker.withAccess") : t("classTeachers.picker.withoutAccess")}
            </Text>
          </span>
          <Button onClick={() => onChange(null)} size="small" variant="outlined">
            {t("classTeachers.picker.change")}
          </Button>
        </PickedPerson>
      </FormFields>
    )
  }

  const renderResults = () => {
    if (!searchTerm) return null
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("classTeachers.picker.searching")}
        </Text>
      )
    }
    if ("error" in current) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("classTeachers.picker.searchFailed")}
        </Text>
      )
    }
    if (current.items.length === 0) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("classTeachers.picker.nobodyFound")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("classTeachers.picker.resultsLabel")}>
        {current.items.map((teacher) => (
          <AccessItem key={teacher.userId}>
            <Text fontSize="sm" semibold>
              {teacher.fullName}
            </Text>
            <Text color="secondary" fontSize="sm">
              {[
                t("classTeachers.picker.number", { id: teacher.userId }),
                teacher.hasAccess ? t("classTeachers.picker.withAccess") : t("classTeachers.picker.withoutAccess"),
              ].join(" · ")}
            </Text>
            <span>
              <Button
                aria-label={t("classTeachers.picker.chooseNamed", { name: teacher.fullName })}
                onClick={() => {
                  onChange(teacher)
                  setTerm("")
                }}
                size="small"
                variant="outlined"
              >
                {t("classTeachers.picker.choose")}
              </Button>
            </span>
          </AccessItem>
        ))}
      </AccessItems>
    )
  }

  return (
    <FormFields aria-label={title} role="group">
      <Input
        error={error}
        helperText={t("classTeachers.picker.helper")}
        maxLength={150}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={keepFormClosed}
        placeholder={t("classTeachers.picker.placeholder")}
        title={title}
        type="search"
        value={term}
        required
      />
      {renderResults()}
    </FormFields>
  )
}
