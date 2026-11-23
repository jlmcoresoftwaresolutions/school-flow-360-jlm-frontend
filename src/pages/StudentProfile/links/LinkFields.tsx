import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { DateInput, Select, Switch } from "@/ds-components/molecules"
import type { CatalogItem } from "@/models"

import { FormFields } from "../../shared/userAccess/userAccess.styles"
import type { LinkFormValues } from "./linkForm"

export type LinkFieldsProps = {
  relationshipTypes: CatalogItem[]
  value: LinkFormValues
  onChange: (value: LinkFormValues) => void
  relationshipError?: string
  // The invitation has no start date: the link is born when the school confirms it.
  withStartDate?: boolean
}

// What a link carries: the relationship from the catalog and the three responsibilities, each one on its
// own (a mother may be the pedagogical guardian and not the financial one, a grandfather only a contact),
// with what each one means, and since when it holds.
export const LinkFields = (props: LinkFieldsProps) => {
  const { onChange, relationshipError, relationshipTypes, value, withStartDate = false } = props

  const { t } = useTranslation()

  const options = relationshipTypes.map((type) => ({ label: type.label, value: type.code }))

  const set = <K extends keyof LinkFormValues>(key: K, next: LinkFormValues[K]) => onChange({ ...value, [key]: next })

  return (
    <FormFields>
      <Select
        error={relationshipError}
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => set("relationshipCode", option?.value ?? "")}
        options={options}
        placeholder={t("guardianLinks.form.relationshipPlaceholder")}
        title={t("students.links.relationship")}
        value={options.find((option) => option.value === value.relationshipCode) ?? null}
        required
      />

      <Text as="h3" fontSize="sm" semibold>
        {t("students.links.responsibilities")}
      </Text>
      <Switch
        checked={value.pedagogicalResponsible}
        helperText={t("guardianLinks.form.pedagogicalHelper")}
        label={t("guardianLinks.form.pedagogical")}
        onChange={(_event, checked) => set("pedagogicalResponsible", checked)}
      />
      <Switch
        checked={value.financialResponsible}
        helperText={t("guardianLinks.form.financialHelper")}
        label={t("guardianLinks.form.financial")}
        onChange={(_event, checked) => set("financialResponsible", checked)}
      />
      <Switch
        checked={value.contactAuthorized}
        helperText={t("guardianLinks.form.contactHelper")}
        label={t("guardianLinks.form.contact")}
        onChange={(_event, checked) => set("contactAuthorized", checked)}
      />

      {withStartDate && (
        <DateInput
          clearLabel={t("people.form.clearDate")}
          helperText={t("guardianLinks.form.startDateHelper")}
          onChange={(date) => set("startDate", date)}
          placeholder={t("common.datePlaceholder")}
          title={t("guardianLinks.form.startDate")}
          value={value.startDate}
        />
      )}
    </FormFields>
  )
}
