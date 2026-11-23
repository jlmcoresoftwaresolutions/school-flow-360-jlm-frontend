import type { StudentGuardianLink } from "@/models"
import { fromIsoDate } from "@/utils/dates"

// The backend's limits for a link: the reason to end it, and the reason of the Admin's exception that
// ends the last guardian of an active student.
export const linkLimits = {
  exceptionMax: 500,
  exceptionMin: 10,
  reasonMax: 500,
}

// What a link carries, as its form keeps it: the relationship (a code of the catalog), the three
// independent responsibilities and since when it holds.
export type LinkFormValues = {
  contactAuthorized: boolean
  financialResponsible: boolean
  pedagogicalResponsible: boolean
  relationshipCode: string
  startDate: Date | null
}

// A new link starts as the backend would leave it: pedagogical yes, financial no, contact yes, from today.
export const emptyLink = (): LinkFormValues => ({
  contactAuthorized: true,
  financialResponsible: false,
  pedagogicalResponsible: true,
  relationshipCode: "",
  startDate: new Date(),
})

export const toLinkFormValues = (link: StudentGuardianLink): LinkFormValues => ({
  contactAuthorized: link.contactAuthorized,
  financialResponsible: link.financialResponsible,
  pedagogicalResponsible: link.pedagogicalResponsible,
  relationshipCode: link.relationshipCode,
  startDate: link.startDate ? fromIsoDate(link.startDate) : null,
})

// The guardian chosen for a link or an invitation: one in the operator's reach goes by its id; one of
// another unit, found by the exact check, by the reuse proof the check gave (`reuseRef`), with only a
// partial name to show.
export type PickedGuardian = {
  detail: string
  guardianId?: number
  name: string
  reuseRef?: string
}
