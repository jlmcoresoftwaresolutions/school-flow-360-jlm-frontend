import { useTranslation } from "react-i18next"

import { Badge } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import type { CatalogItem, Guardian } from "@/models"
import { defaultCountry } from "@/utils/countries"
import { formatDate } from "@/utils/dates"
import { formatPhoneForDisplay } from "@/utils/phone"

import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { formatPersonAddress } from "../shared/people/personForm"

export type GuardianDataProps = {
  documentTypes: CatalogItem[]
  guardian: Guardian
}

// The guardian's registration data, read only, in blocks: identity (with the units it belongs to and
// whether it has an access, which only an invitation gives), contact, document (masked) and address.
export const GuardianData = (props: GuardianDataProps) => {
  const { documentTypes, guardian } = props

  const { t } = useTranslation()

  const documentLabel =
    documentTypes.find((type) => type.code === guardian.documentType)?.label ?? guardian.documentType

  return (
    <PersonSections>
      <PersonBlock title={t("people.form.identityTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "fullName", label: t("people.form.fullNameLabel"), value: guardian.fullName },
            { key: "socialName", label: t("people.form.socialNameLabel"), value: guardian.socialName ?? "" },
            {
              key: "birthDate",
              label: t("people.form.birthDateLabel"),
              value: guardian.birthDate ? formatDate(guardian.birthDate) : "",
            },
            {
              key: "units",
              label: t("guardians.form.unitsLabel"),
              value: guardian.units.map((unit) => unit.name).join(", "),
            },
            {
              key: "access",
              label: t("students.profile.access"),
              value: (
                <Badge tone={guardian.hasAccess ? "success" : "neutral"}>
                  {guardian.hasAccess ? t("students.profile.hasAccess") : t("students.profile.noAccess")}
                </Badge>
              ),
            },
          ]}
        />
      </PersonBlock>

      <PersonBlock title={t("people.form.contactTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "email", label: t("people.form.contactEmailLabel"), value: guardian.contactEmail ?? "" },
            {
              key: "phone",
              label: t("people.form.phoneLabel"),
              value: guardian.phone ? formatPhoneForDisplay(guardian.phone, defaultCountry) : "",
            },
          ]}
        />
      </PersonBlock>

      <PersonBlock title={t("people.form.documentTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            { key: "type", label: t("people.form.documentTypeLabel"), value: documentLabel ?? "" },
            { key: "number", label: t("people.form.documentNumberLabel"), value: guardian.maskedDocument ?? "" },
          ]}
        />
      </PersonBlock>

      <PersonBlock title={t("people.form.addressTitle")}>
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              fullWidth: true,
              key: "address",
              label: t("people.form.addressTitle"),
              value: formatPersonAddress(guardian.address),
            },
          ]}
        />
      </PersonBlock>
    </PersonSections>
  )
}
