import type { PersonSignals, Student } from "@/models"

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

// The data the backend checks for a duplicate when a student is saved, the same it checks: on a create,
// the contact e-mail, the document and the name with the birth date; on an edit, only an e-mail or a
// document that changed (`current`, the student as read).
export const toStudentSignals = (values: StudentFormValues, current: Student | null): PersonSignals => {
  const fields = toPersonFields(values)

  if (!current) {
    return {
      birthDate: fields.birthDate,
      documentNumber: fields.documentNumber,
      documentType: fields.documentType,
      email: fields.contactEmail,
      fullName: fields.fullName,
    }
  }

  const emailChanged = (fields.contactEmail ?? "").toLowerCase() !== (current.contactEmail ?? "").toLowerCase()

  return {
    documentNumber: fields.documentNumber,
    documentType: fields.documentType,
    email: emailChanged ? fields.contactEmail : undefined,
  }
}
