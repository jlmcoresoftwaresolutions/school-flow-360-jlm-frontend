import type { PersonDocumentStatus } from "@/models"

// The backend's rules for a document's file (P03 contract, slice 4): PDF, JPEG or PNG (checked by the
// content on the server, by the type and extension here) and at most 10 MB. A number has the same limit
// as the person's document.
export const documentLimits = {
  maxFileBytes: 10 * 1024 * 1024,
  number: 40,
}

export const documentFileAccept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"

const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"]

export type DocumentFileProblem = "size" | "type"

// What the backend would refuse in a file, caught before it is sent: a type other than PDF, JPEG or PNG,
// or a file over 10 MB. An empty type (some systems don't say it) falls back to the extension.
export const checkDocumentFile = (file: File): DocumentFileProblem | null => {
  const name = file.name.toLowerCase()
  const typeAllowed = file.type
    ? allowedTypes.includes(file.type)
    : allowedExtensions.some((extension) => name.endsWith(extension))
  if (!typeAllowed) return "type"
  if (file.size > documentLimits.maxFileBytes) return "size"
  return null
}

export const documentStatusTone: Record<PersonDocumentStatus, "danger" | "neutral" | "success" | "warning"> = {
  ARCHIVED: "neutral",
  EXPIRED: "danger",
  NO_FILE: "warning",
  VALID: "success",
}
