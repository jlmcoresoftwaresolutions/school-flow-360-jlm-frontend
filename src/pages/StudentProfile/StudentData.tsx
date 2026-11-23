import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Text } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import type { CatalogItem, Student } from "@/models"
import { defaultCountry } from "@/utils/countries"
import { formatDate } from "@/utils/dates"
import { formatPhoneForDisplay } from "@/utils/phone"

import { PersonSection, PersonSections } from "../shared/people/people.styles"

export type StudentDataProps = {
  documentTypes: CatalogItem[]
  student: Student
}

const Block = (props: { children: ReactNode; title: string }) => {
  const { children, title } = props

  return (
    <PersonSection aria-label={title}>
      <Text as="h2" fontSize="md" semibold>
        {title}
      </Text>
      {children}
    </PersonSection>
  )
}

// The student's registration data, read only, in blocks: identity (with the registration code - not an
// enrollment number - the nickname and whether it has an access), unit, contact, document (masked),
// address and observation. A draft says what still keeps it from being activated.
export const StudentData = (props: StudentDataProps) => {
  const { documentTypes, student } = props

  const { t } = useTranslation()

  const address = student.address
  const addressLine = address
    ? [
        [address.street, address.number, address.complement].filter(Boolean).join(", "),
        address.neighborhood,
        [address.city, address.state].filter(Boolean).join("/"),
        address.postalCode,
      ]
        .filter(Boolean)
        .join(" · ")
    : ""
  const documentLabel = documentTypes.find((type) => type.code === student.documentType)?.label ?? student.documentType
  const blockers = student.status === "DRAFT" ? student.activationBlockers : []

  return (
    <PersonSections>
      {blockers.length > 0 && (
        <Text as="p" color="warning" fontSize="sm" role="note">
          {t("students.profile.blockers", {
            blockers: blockers.map((blocker) => t(`students.blockers.${blocker}`)).join(", "),
          })}
        </Text>
      )}

      <Block title={t("people.form.identityTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "fullName", label: t("people.form.fullNameLabel"), value: student.fullName },
            { key: "socialName", label: t("people.form.socialNameLabel"), value: student.socialName ?? "" },
            {
              key: "birthDate",
              label: t("people.form.birthDateLabel"),
              value: student.birthDate ? formatDate(student.birthDate) : "",
            },
            { key: "code", label: t("students.profile.code"), value: student.studentCode },
            { key: "nickname", label: t("students.form.nicknameLabel"), value: student.nickname ?? "" },
            {
              key: "access",
              label: t("students.profile.access"),
              value: (
                <Badge tone={student.hasAccess ? "success" : "neutral"}>
                  {student.hasAccess ? t("students.profile.hasAccess") : t("students.profile.noAccess")}
                </Badge>
              ),
            },
            { key: "unit", label: t("students.referenceUnit"), value: student.referenceUnit?.name ?? "" },
          ]}
        />
      </Block>

      <Block title={t("people.form.contactTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "email", label: t("people.form.contactEmailLabel"), value: student.contactEmail ?? "" },
            {
              key: "phone",
              label: t("people.form.phoneLabel"),
              value: student.phone ? formatPhoneForDisplay(student.phone, defaultCountry) : "",
            },
          ]}
        />
      </Block>

      <Block title={t("people.form.documentTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "type", label: t("people.form.documentTypeLabel"), value: documentLabel ?? "" },
            { key: "number", label: t("people.form.documentNumberLabel"), value: student.maskedDocument ?? "" },
          ]}
        />
      </Block>

      <Block title={t("people.form.addressTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[{ fullWidth: true, key: "address", label: t("people.form.addressTitle"), value: addressLine }]}
        />
      </Block>

      <Block title={t("students.form.observationTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              fullWidth: true,
              key: "observation",
              label: t("students.form.observationLabel"),
              value: student.observation ?? "",
            },
          ]}
        />
      </Block>
    </PersonSections>
  )
}
