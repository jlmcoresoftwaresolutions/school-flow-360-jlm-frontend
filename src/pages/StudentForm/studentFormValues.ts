import type { Student } from "@/models"

import { emptyPerson, type PersonFormValues, toPersonFields, toPersonFormValues } from "../shared/people/personForm"

// A student's form: the person's data, its reference unit, the observation and, when created, the
// nickname it will sign in with (suggested by the backend when left blank).
export type StudentFormValues = PersonFormValues & {
  nickname: string
  observation: string
  referenceUnitId: string
}

export const observationMaxLength = 500

// The nickname rule of the backend (and of the login): 3 to 60 letters, digits, ".", "_" or "-".
export const nicknamePattern = /^[a-z0-9._-]{3,60}$/i

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
