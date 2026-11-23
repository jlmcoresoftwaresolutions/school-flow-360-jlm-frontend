import type { PersonAddress, StudentFields } from "@/models"
import { defaultCountry } from "@/utils/countries"
import { fromIsoDate, toIsoDate } from "@/utils/dates"
import { toInternationalPhone } from "@/utils/phone"

// The cadastral data of a person (a student or a guardian) as the form keeps it, every field a string
// except the birth date. The backend takes the same fields flat, blank ones left out.
export type PersonFormValues = {
  addressNumber: string
  birthDate: Date | null
  city: string
  complement: string
  contactEmail: string
  documentNumber: string
  documentType: string
  fullName: string
  neighborhood: string
  phone: string
  postalCode: string
  socialName: string
  state: string
  street: string
}

// The backend's limits for each field (PersonWriter), so the form refuses what it would.
export const personLimits = {
  addressNumber: 20,
  city: 80,
  complement: 80,
  contactEmail: 255,
  documentNumber: 40,
  fullName: 150,
  neighborhood: 80,
  phone: 30,
  postalCode: 10,
  socialName: 150,
  street: 150,
}

export const emptyPerson: PersonFormValues = {
  addressNumber: "",
  birthDate: null,
  city: "",
  complement: "",
  contactEmail: "",
  documentNumber: "",
  documentType: "",
  fullName: "",
  neighborhood: "",
  phone: "",
  postalCode: "",
  socialName: "",
  state: "",
  street: "",
}

type PersonRecord = {
  address: PersonAddress | null
  birthDate: string | null
  contactEmail: string | null
  documentType: string | null
  fullName: string
  phone: string | null
  socialName: string | null
}

// The form's values for a person read from the backend. The document number only comes masked, so its
// field starts blank: left blank on an update, the backend keeps the one on record.
export const toPersonFormValues = (person: PersonRecord): PersonFormValues => ({
  addressNumber: person.address?.number ?? "",
  birthDate: person.birthDate ? fromIsoDate(person.birthDate) : null,
  city: person.address?.city ?? "",
  complement: person.address?.complement ?? "",
  contactEmail: person.contactEmail ?? "",
  documentNumber: "",
  documentType: person.documentType ?? "",
  fullName: person.fullName,
  neighborhood: person.address?.neighborhood ?? "",
  phone: person.phone ?? "",
  postalCode: person.address?.postalCode ?? "",
  socialName: person.socialName ?? "",
  state: person.address?.state ?? "",
  street: person.address?.street ?? "",
})

const optional = (value: string) => value.trim() || undefined

// The person's part of a create or update body: blank fields left out; the phone in the international
// format; the document only with its number (a type alone is refused, and a blank number on an update
// keeps the current document).
export const toPersonFields = (values: PersonFormValues): Omit<StudentFields, "referenceUnitId"> => {
  const documentNumber = optional(values.documentNumber)

  return {
    addressNumber: optional(values.addressNumber),
    birthDate: values.birthDate ? toIsoDate(values.birthDate) : undefined,
    city: optional(values.city),
    complement: optional(values.complement),
    contactEmail: optional(values.contactEmail),
    documentNumber,
    documentType: documentNumber ? optional(values.documentType) : undefined,
    fullName: values.fullName.trim(),
    neighborhood: optional(values.neighborhood),
    phone: values.phone.trim() ? toInternationalPhone(values.phone, defaultCountry) : undefined,
    postalCode: optional(values.postalCode),
    socialName: optional(values.socialName),
    state: optional(values.state),
    street: optional(values.street),
  }
}
