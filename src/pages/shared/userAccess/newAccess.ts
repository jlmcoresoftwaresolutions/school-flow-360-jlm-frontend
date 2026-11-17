import type { NewUserRequest, RoleCode } from "@/models"
import { defaultCountry } from "@/utils/countries"
import { toInternationalPhone } from "@/utils/phone"

// invite: "Convidar usuário" (POST /api/invitations). register: the manual registration (POST
// /api/users). Both create the same 48 h invitation; the account exists once the person accepts it.
export type NewAccessMode = "invite" | "register"

// One row of the access part: a role and the unit it is granted in (as the unit select's value; empty
// for an Admin, whose reach is the whole institution).
export type AssignmentDraft = {
  role: RoleCode | ""
  unitId: string
}

export type NewAccessValues = {
  assignments: AssignmentDraft[]
  email: string
  fullName: string
  phone: string
}

// The backend's limits (longer is a 400 INVALID_REQUEST).
export const newAccessLimits = { assignments: 10, email: 255, fullName: 150, phone: 30 }

export const emptyAssignment: AssignmentDraft = { role: "", unitId: "" }

export const emptyNewAccess: NewAccessValues = { assignments: [emptyAssignment], email: "", fullName: "", phone: "" }

// What the backend takes: the e-mail trimmed and in lower case (as it stores it), the name and phone
// only when given (the phone in the international format), and each role with its unit (none for an
// Admin).
export const toNewUserRequest = (values: NewAccessValues): NewUserRequest => {
  const request: NewUserRequest = {
    assignments: values.assignments.map((assignment) => ({
      roleCode: assignment.role as RoleCode,
      schoolUnitId: assignment.role === "ADMIN" ? null : Number(assignment.unitId),
    })),
    email: values.email.trim().toLowerCase(),
  }

  const fullName = values.fullName.trim()
  if (fullName) request.fullName = fullName
  if (values.phone.trim()) request.phone = toInternationalPhone(values.phone, defaultCountry)

  return request
}
