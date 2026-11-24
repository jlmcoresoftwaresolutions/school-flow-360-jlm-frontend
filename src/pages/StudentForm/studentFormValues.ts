import type { Student } from "@/models"

import { emptyPerson, type PersonFormValues, toPersonFields, toPersonFormValues } from "../shared/people/personForm"

// A student's form: the person's data, its reference unit, the observation and the nickname it signs in
// with (when created, suggested by the backend when left blank).
export type StudentFormValues = PersonFormValues & {
  nickname: string
  observation: string
  referenceUnitId: string
}

export const observationMaxLength = 500

export const emptyStudentForm: StudentFormValues = {
  ...emptyPerson,
  nickname: "",
  observation: "",
  referenceUnitId: "",
}

export const toStudentFormValues = (student: Student): StudentFormValues => ({
  ...toPersonFormValues(student),
  nickname: student.nickname ?? "",
  observation: student.observation ?? "",
  referenceUnitId: student.referenceUnit ? String(student.referenceUnit.id) : "",
})

export const toStudentFields = (values: StudentFormValues) => ({
  ...toPersonFields(values),
  observation: values.observation.trim() || undefined,
  referenceUnitId: Number(values.referenceUnitId),
})
