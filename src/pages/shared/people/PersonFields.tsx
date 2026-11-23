import { type ReactNode, useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, Input, Select } from "@/ds-components/molecules"
import { PhoneInput } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { CatalogItem } from "@/models"
import { getAddressByCep } from "@/services/viaCep"
import { brazilianStates } from "@/utils/address"
import { defaultCountry } from "@/utils/countries"
import { isValidEmail } from "@/utils/email"
import { stripNonDigits } from "@/utils/formats"
import { isValidPhone } from "@/utils/phone"

import { usePhoneInputTexts } from "../phone/usePhoneInputTexts"
import { FieldRow, PersonSection } from "./people.styles"
import { type PersonFormValues, personLimits } from "./personForm"

const stateOptions: SelectOption[] = brazilianStates.map((state) => ({ label: state, value: state }))

const stateMenuMaxHeight = Number.parseFloat(spacing[192])

type CepLookup = "idle" | "notFound" | "searching" | "unavailable"

type SectionProps = {
  title: string
  children: ReactNode
}

const Section = (props: SectionProps) => {
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

export type PersonIdentityFieldsProps = {
  // Says why the birth date matters for this person (a student needs it to be activated).
  birthDateHelper?: string
  // Fields of the person kind shown after the identity ones (a student's nickname).
  children?: ReactNode
}

// The person's identity: full name (required), social name and birth date (not in the future).
export const PersonIdentityFields = (props: PersonIdentityFieldsProps) => {
  const { birthDateHelper, children } = props

  const { t } = useTranslation()
  const { control, formState, register } = useFormContext<PersonFormValues>()

  const { errors } = formState

  return (
    <Section title={t("people.form.identityTitle")}>
      <Input
        error={errors.fullName?.message}
        maxLength={personLimits.fullName}
        placeholder={t("people.form.fullNamePlaceholder")}
        title={t("people.form.fullNameLabel")}
        required
        {...register("fullName", { validate: (value) => value.trim() !== "" || t("people.form.fullNameRequired") })}
      />
      <FieldRow>
        <Input
          error={errors.socialName?.message}
          helperText={t("people.form.socialNameHelper")}
          maxLength={personLimits.socialName}
          placeholder={t("people.form.socialNamePlaceholder")}
          title={t("people.form.socialNameLabel")}
          {...register("socialName")}
        />
        <Controller
          control={control}
          name="birthDate"
          render={(controller) => (
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={controller.fieldState.error?.message}
              helperText={birthDateHelper}
              maxDate={new Date()}
              name={controller.field.name}
              onBlur={controller.field.onBlur}
              onChange={controller.field.onChange}
              placeholder={t("common.datePlaceholder")}
              title={t("people.form.birthDateLabel")}
              value={controller.field.value}
            />
          )}
          rules={{ validate: (value) => !value || value <= new Date() || t("people.form.birthDateFuture") }}
        />
      </FieldRow>
      {children}
    </Section>
  )
}

// The person's contact: an e-mail (checked like the backend does) and a phone of any country.
export const PersonContactFields = () => {
  const { t } = useTranslation()
  const phoneTexts = usePhoneInputTexts()
  const { control, formState, register } = useFormContext<PersonFormValues>()

  const { errors } = formState

  return (
    <Section title={t("people.form.contactTitle")}>
      <FieldRow>
        <Input
          autoComplete="off"
          error={errors.contactEmail?.message}
          maxLength={personLimits.contactEmail}
          placeholder={t("people.form.contactEmailPlaceholder")}
          title={t("people.form.contactEmailLabel")}
          type="email"
          {...register("contactEmail", {
            validate: (value) => value.trim() === "" || isValidEmail(value.trim()) || t("people.form.emailInvalid"),
          })}
        />
        <Controller
          control={control}
          name="phone"
          render={(controller) => (
            <PhoneInput
              {...phoneTexts}
              error={controller.fieldState.error?.message}
              helperText={t("people.form.phoneHelper")}
              name={controller.field.name}
              onBlur={controller.field.onBlur}
              onChange={controller.field.onChange}
              placeholder={t("people.form.phonePlaceholder")}
              title={t("people.form.phoneLabel")}
              value={controller.field.value}
            />
          )}
          rules={{
            validate: (value) =>
              value.trim() === "" || isValidPhone(value, defaultCountry) || t("people.form.phoneInvalid"),
          }}
        />
      </FieldRow>
    </Section>
  )
}

export type PersonDocumentFieldsProps = {
  // The document on record, masked (an edit): a blank number keeps it.
  currentDocument?: string | null
  documentTypes: CatalogItem[]
}

// The person's document: a type from the catalog and the number, always together (no document is
// mandatory). Editing a person whose document is on record, a blank number keeps it.
export const PersonDocumentFields = (props: PersonDocumentFieldsProps) => {
  const { currentDocument, documentTypes } = props

  const { t } = useTranslation()
  const { control, formState, getValues, register } = useFormContext<PersonFormValues>()

  const { errors } = formState
  const typeOptions: SelectOption[] = documentTypes.map((type) => ({ label: type.label, value: type.code }))
  const numberHelper = currentDocument
    ? t("people.form.documentKeepHelper", { document: currentDocument })
    : t("people.form.documentHelper")

  return (
    <Section title={t("people.form.documentTitle")}>
      <FieldRow>
        <Controller
          control={control}
          name="documentType"
          render={(controller) => (
            <Select
              error={controller.fieldState.error?.message}
              name={controller.field.name}
              noOptionsMessage={t("common.noOptions")}
              onBlur={controller.field.onBlur}
              onChange={(option) => controller.field.onChange(option?.value ?? "")}
              options={typeOptions}
              placeholder={t("people.form.documentTypePlaceholder")}
              title={t("people.form.documentTypeLabel")}
              value={typeOptions.find((option) => option.value === controller.field.value) ?? null}
            />
          )}
          rules={{
            validate: (value) =>
              value !== "" || getValues("documentNumber").trim() === "" || t("people.form.documentTypeRequired"),
          }}
        />
        <Input
          autoComplete="off"
          error={errors.documentNumber?.message}
          helperText={numberHelper}
          maxLength={personLimits.documentNumber}
          placeholder={t("people.form.documentNumberPlaceholder")}
          title={t("people.form.documentNumberLabel")}
          {...register("documentNumber", {
            validate: (value) =>
              value.trim() !== "" ||
              getValues("documentType") === "" ||
              Boolean(currentDocument) ||
              t("people.form.documentNumberRequired"),
          })}
        />
      </FieldRow>
    </Section>
  )
}

// The person's address, all optional: a full CEP is looked up on ViaCEP and fills the street, district,
// city and state, which stay editable (a CEP not found, or a lookup that fails, only says so).
export const PersonAddressFields = () => {
  const { t } = useTranslation()
  const { control, formState, register, setValue } = useFormContext<PersonFormValues>()

  const [cepLookup, setCepLookup] = useState<CepLookup>("idle")

  const { errors } = formState
  const cepHelper: Record<CepLookup, string | undefined> = {
    idle: undefined,
    notFound: t("people.form.cepNotFound"),
    searching: t("people.form.cepSearching"),
    unavailable: t("people.form.cepUnavailable"),
  }

  const lookUpCep = async (cep: string) => {
    if (stripNonDigits(cep).length !== 8) {
      setCepLookup("idle")
      return
    }

    setCepLookup("searching")
    try {
      const found = await getAddressByCep(cep, { showLoading: false })
      if (found.erro) {
        setCepLookup("notFound")
        return
      }

      const options = { shouldDirty: true }
      setValue("street", found.logradouro.slice(0, personLimits.street), options)
      setValue("neighborhood", found.bairro.slice(0, personLimits.neighborhood), options)
      setValue("city", found.localidade.slice(0, personLimits.city), options)
      setValue("state", found.uf, options)
      setCepLookup("idle")
    } catch {
      setCepLookup("unavailable")
    }
  }

  return (
    <Section title={t("people.form.addressTitle")}>
      <FieldRow>
        <Controller
          control={control}
          name="postalCode"
          render={(controller) => (
            <Input
              autoComplete="off"
              helperText={cepHelper[cepLookup]}
              mask="cep"
              name={controller.field.name}
              onBlur={controller.field.onBlur}
              onChange={(event) => {
                controller.field.onChange(event.target.value)
                void lookUpCep(event.target.value)
              }}
              placeholder={t("people.form.postalCodePlaceholder")}
              ref={controller.field.ref}
              title={t("people.form.postalCodeLabel")}
              value={controller.field.value}
            />
          )}
        />
        <Input
          error={errors.street?.message}
          maxLength={personLimits.street}
          placeholder={t("people.form.streetPlaceholder")}
          title={t("people.form.streetLabel")}
          {...register("street")}
        />
      </FieldRow>
      <FieldRow>
        <Input
          error={errors.addressNumber?.message}
          maxLength={personLimits.addressNumber}
          placeholder={t("people.form.addressNumberPlaceholder")}
          title={t("people.form.addressNumberLabel")}
          {...register("addressNumber")}
        />
        <Input
          error={errors.complement?.message}
          maxLength={personLimits.complement}
          placeholder={t("people.form.complementPlaceholder")}
          title={t("people.form.complementLabel")}
          {...register("complement")}
        />
        <Input
          error={errors.neighborhood?.message}
          maxLength={personLimits.neighborhood}
          placeholder={t("people.form.neighborhoodPlaceholder")}
          title={t("people.form.neighborhoodLabel")}
          {...register("neighborhood")}
        />
      </FieldRow>
      <FieldRow>
        <Input
          error={errors.city?.message}
          maxLength={personLimits.city}
          placeholder={t("people.form.cityPlaceholder")}
          title={t("people.form.cityLabel")}
          {...register("city")}
        />
        <Controller
          control={control}
          name="state"
          render={(controller) => (
            <Select
              maxMenuHeight={stateMenuMaxHeight}
              name={controller.field.name}
              noOptionsMessage={t("common.noOptions")}
              onBlur={controller.field.onBlur}
              onChange={(option) => controller.field.onChange(option?.value ?? "")}
              options={stateOptions}
              placeholder={t("people.form.statePlaceholder")}
              title={t("people.form.stateLabel")}
              value={stateOptions.find((option) => option.value === controller.field.value) ?? null}
            />
          )}
        />
      </FieldRow>
    </Section>
  )
}
