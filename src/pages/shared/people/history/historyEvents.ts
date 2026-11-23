import type { PersonHistoryItem } from "@/models"

// The events a person's history brings (the backend's audit of P03), each with its own label. An event
// not listed here shows its code, so a new one never breaks the page.
export const historyActions = [
  "GUARDIAN_ACTIVATED",
  "GUARDIAN_CREATED",
  "GUARDIAN_INACTIVATED",
  "GUARDIAN_INVITATION_CONFIRMED",
  "GUARDIAN_INVITATION_REJECTED",
  "GUARDIAN_INVITED_FOR_STUDENT",
  "GUARDIAN_REACTIVATED",
  "GUARDIAN_UPDATED",
  "PERSON_ANONYMIZED",
  "PERSON_EXPORTED",
  "STUDENT_ACTIVATED",
  "STUDENT_CREATED",
  "STUDENT_DISCARDED",
  "STUDENT_GUARDIAN_LINK_CREATED",
  "STUDENT_GUARDIAN_LINK_ENDED",
  "STUDENT_GUARDIAN_LINK_UPDATED",
  "STUDENT_INACTIVATED",
  "STUDENT_REACTIVATED",
  "STUDENT_UPDATED",
  "STUDENT_WITHOUT_GUARDIAN_EXCEPTION",
] as const

export type HistoryAction = (typeof historyActions)[number]

export const isHistoryAction = (action: string): action is HistoryAction =>
  (historyActions as readonly string[]).includes(action)

// The fields a change may name: a person's data, and the parts of a link.
export const historyFields = [
  "addressNumber",
  "birthDate",
  "city",
  "complement",
  "contact",
  "contactEmail",
  "document",
  "financial",
  "fullName",
  "neighborhood",
  "nickname",
  "observation",
  "pedagogical",
  "phone",
  "postalCode",
  "referenceUnit",
  "relationship",
  "socialName",
  "startDate",
  "state",
  "street",
] as const

export type HistoryField = (typeof historyFields)[number]

export const isHistoryField = (field: string): field is HistoryField =>
  (historyFields as readonly string[]).includes(field)

export const historyEntities = ["GUARDIAN", "STUDENT", "STUDENT_GUARDIAN_LINK"] as const

export type HistoryEntity = (typeof historyEntities)[number]

export const isHistoryEntity = (entity: string | null): entity is HistoryEntity =>
  entity !== null && (historyEntities as readonly string[]).includes(entity)

// The parts of a link as the backend describes it ("rel=MOTHER;ped=true;fin=false;con=true;start=...").
const linkParts: Record<string, HistoryField> = {
  con: "contact",
  fin: "financial",
  ped: "pedagogical",
  rel: "relationship",
  start: "startDate",
}

const readLinkDescription = (text: string): Record<string, string> =>
  Object.fromEntries(
    text
      .split(";")
      .map((part) => part.split("="))
      .filter((pair) => pair.length === 2 && pair[0] in linkParts),
  )

// What changed in an event, by name only (the history never shows values): the fields a person's change
// lists ("fields=fullName,phone"), or the parts of a link that differ between its before and after. Any
// other detail (the id of an invitation...) is not shown.
export const readHistoryChanges = (item: PersonHistoryItem): string[] => {
  const details = item.details ?? ""

  const fields = details.match(/fields=([\w,]+)/)
  if (fields) return fields[1].split(",").filter(Boolean)

  const link = details.match(/^before:(.*)\|after:(.*)$/)
  if (link) {
    const before = readLinkDescription(link[1])
    const after = readLinkDescription(link[2])
    return Object.keys(linkParts)
      .filter((key) => key in before && key in after && before[key] !== after[key])
      .map((key) => linkParts[key])
  }

  return []
}
