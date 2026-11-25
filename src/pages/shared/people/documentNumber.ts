import type { MaskType } from "@/ds-components/molecules/Input/Input.masks"
import type { TranslationResource } from "@/i18n/locales/ptBR"
import { isValidCpf } from "@/utils/documents"
import { formatCpf, stripNonDigits } from "@/utils/formats"

type DocumentPlaceholderKey = keyof Pick<
  TranslationResource["people"]["form"],
  "documentNumberPlaceholder" | "documentNumberPlaceholderCnh" | "documentNumberPlaceholderCpf"
>

// How a document's number is typed for its catalog type: a CPF masked (000.000.000-00), a CNH only its
// digits, any other type (an RG differs by state, a passport has letters) free. The backend keeps only the
// letters and digits, so the mask never reaches it.
export type DocumentNumberInput = {
  inputMode?: "numeric"
  mask?: MaskType
  numeric: boolean
  placeholderKey: DocumentPlaceholderKey
}

export const getDocumentNumberInput = (type: string): DocumentNumberInput => {
  if (type === "CPF") {
    return { inputMode: "numeric", mask: "cpf", numeric: false, placeholderKey: "documentNumberPlaceholderCpf" }
  }
  if (type === "CNH") return { inputMode: "numeric", numeric: true, placeholderKey: "documentNumberPlaceholderCnh" }

  return { numeric: false, placeholderKey: "documentNumberPlaceholder" }
}

// A number typed before its type was chosen, in the new type's pattern.
export const toDocumentNumberPattern = (type: string, number: string): string => {
  if (!number) return number
  if (type === "CPF") return formatCpf(number)
  if (type === "CNH") return stripNonDigits(number)

  return number
}

// Whether a typed number is acceptable for its type: only a CPF is checked (its check digits), the backend
// checking the rest.
export const isDocumentNumberValid = (type: string, number: string): boolean =>
  type !== "CPF" || number.trim() === "" || isValidCpf(number)
