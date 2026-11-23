import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { Input, Pagination, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import { useDebouncedValue } from "@/hooks"
import type { AcademicClassStudent, AcademicClassStudents } from "@/models"
import { listAcademicClassStudents } from "@/services/academicClassDetail"

import { useAcademicLabels } from "../../shared/academic/useAcademicLabels"
import { ListContent } from "../../shared/userAccess/userAccess.styles"

export type ClassStudentsProps = {
  classId: number
  // Changes whenever the class changed, to read the list again.
  refreshKey: number
}

type StudentsResult = { error: true; key: string } | { key: string; students: AcademicClassStudents }

const pageSize = 20

// The enrollment statuses the screen knows (an unknown one shows its code as it came).
const enrollmentStatuses = [
  "ABANDONED",
  "ACTIVE",
  "BLOCKED",
  "CANCELLED",
  "COMPLETED",
  "DRAFT",
  "LOCKED",
  "PENDING",
  "TRANSFERRED",
] as const

type EnrollmentStatus = (typeof enrollmentStatuses)[number]

const isEnrollmentStatus = (value: string): value is EnrollmentStatus =>
  (enrollmentStatuses as readonly string[]).includes(value)

// The Students tab of a class: the list comes only from the enrollment, read in its own call, with the
// moment it was taken. While the enrollment doesn't answer, it says so - never an empty class nor zero
// students. Nobody is added to or taken out of a class here, and no document, health or family data is
// shown.
export const ClassStudents = (props: ClassStudentsProps) => {
  const { classId, refreshKey } = props

  const { t } = useTranslation()
  const { formatMoment } = useAcademicLabels()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<StudentsResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const term = useDebouncedValue(search.trim())

  const requestKey = `${classId}#${refreshKey}#${reloadToken}#${term}#${page}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const students = await listAcademicClassStudents(
          classId,
          { page: page - 1, q: term || undefined, size: pageSize },
          { showLoading: false },
        )
        if (!isStale) setResult({ key: requestKey, students })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [classId, page, requestKey, term])

  // Only the answer of the present query is shown (never another class's, nor an older search's).
  const current = result?.key === requestKey ? result : null
  const reload = () => setReloadToken((value) => value + 1)

  if (current && "error" in current) {
    return (
      <StateMessage
        action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
        description={t("classStudents.errorDescription")}
        title={t("classStudents.errorTitle")}
        variant="error"
      />
    )
  }

  if (current && current.students.status === "UNAVAILABLE") {
    return (
      <StateMessage
        action={
          <Button onClick={reload} variant="outlined">
            {t("common.tryAgain")}
          </Button>
        }
        description={t("classStudents.unavailableDescription")}
        icon="school-outline"
        title={t("classStudents.unavailableTitle")}
      />
    )
  }

  const students = current?.students
  const totalPages = students?.total ? Math.ceil(students.total / pageSize) : 0

  return (
    <ListContent>
      <Text color="secondary" fontSize="sm">
        {t("classStudents.description")}
      </Text>
      <Input
        maxLength={150}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
        placeholder={t("classStudents.searchPlaceholder")}
        title={t("classStudents.searchLabel")}
        type="search"
        value={search}
      />
      <Table
        dataKey="enrollmentId"
        emptyMessage={term ? t("classStudents.noResults") : t("classStudents.empty")}
        loading={!current}
        loadingMessage={t("classStudents.loading")}
        value={students?.items ?? []}
      >
        <Table.Column
          body={(row: AcademicClassStudent) => (
            <Text fontSize="sm" semibold>
              {row.name}
            </Text>
          )}
          field="name"
          header={t("classStudents.student")}
        />
        <Table.Column
          body={(row: AcademicClassStudent) => (
            <Text fontSize="sm">
              {isEnrollmentStatus(row.status) ? t(`classStudents.statuses.${row.status}`) : row.status}
            </Text>
          )}
          field="status"
          header={t("classStudents.enrollmentStatus")}
        />
      </Table>
      {students?.asOf && (
        <Text color="secondary" fontSize="sm">
          {t("classStudents.asOf", { date: formatMoment(students.asOf) })}
        </Text>
      )}
      {totalPages > 1 && (
        <Pagination
          label={t("classStudents.paginationLabel")}
          nextLabel={t("common.nextPage")}
          onChange={setPage}
          page={page}
          pageLabel={(number) => t("common.pageLabel", { page: number })}
          previousLabel={t("common.previousPage")}
          style={{ alignSelf: "flex-end" }}
          totalPages={totalPages}
        />
      )}
    </ListContent>
  )
}
