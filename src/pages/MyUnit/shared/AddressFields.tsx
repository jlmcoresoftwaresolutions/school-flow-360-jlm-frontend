import { useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Grid } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Input, Select } from "@/ds-components/molecules"
import type { Address } from "@/models"
import { getAddressByCep } from "@/services/viaCep"
import { brazilianStates } from "@/utils/address"
import { getCountryOptions, isCountry } from "@/utils/countries"
import { stripNonDigits } from "@/utils/formats"

import { addressMaxLengths, addressNumberPattern } from "../MyUnit.constants"
import { useOrganizationCountry } from "./organizationCountry"

// Any form holding an address under `address` (the organization's and a unit's).
export type AddressFormValues = {
  address: Address
}

export type AddressFieldsProps = {
  // Shows the country field (the organization's address). Without it the address is in the
  // organization's country, as a unit's is.
  withCountry?: boolean
}

type CepLookup = "idle" | "notFound" | "searching" | "unavailable"

const stateOptions: SelectOption[] = brazilianStates.map((state) => ({ label: state, value: state }))

// The backend's limits for the postal code and the state, which a foreign address types freely.
const postalCodeMaxLength = 20
const regionMaxLength = 20

// The address fields of a react-hook-form form (read through its FormProvider), shaped by the
// address's country. A Brazilian one has the CEP (masked; a full one is looked up on ViaCEP and fills
// the street, district, city and state, which stay editable - a CEP not found, or a lookup that fails,
// only says so) and the state as a UF, required. Any other has the postal code and the state/region as
// free text, the region optional, and no lookup. Changing the country clears the postal code and the
// state. The city is always required; the lengths and the
// number's characters are the backend's limits.
export const AddressFields = (props: AddressFieldsProps) => {
  const { withCountry } = props

  const { i18n, t } = useTranslation()
  const { control, formState, register, setValue } = useFormContext<AddressFormValues>()
  const organizationCountry = useOrganizationCountry()
  const chosenCountry = useWatch({ control, name: "address.country" })

  const [cepLookup, setCepLookup] = useState<CepLookup>("idle")

  const { errors } = formState
  const requiredMessage = t("myUnit.validation.required")
  const country = withCountry && isCountry(chosenCountry) ? chosenCountry : organizationCountry
  const isBrazilian = country === "BR"
  const countryOptions: SelectOption[] = withCountry ? getCountryOptions(i18n.language) : []

  const lookUpCep = async (cep: string) => {
    if (!isBrazilian || stripNonDigits(cep).length !== 8) {
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

      const fill = { shouldDirty: true, shouldValidate: true }
      setValue("address.street", found.logradouro, fill)
      setValue("address.district", found.bairro, fill)
      setValue("address.city", found.localidade, fill)
      setValue("address.state", found.uf, fill)
      setCepLookup("idle")
    } catch {
      setCepLookup("unavailable")
    }
  }

  // Another country's postal code and state don't fit this one's (a UF means nothing abroad), so they
  // are cleared for the new country's; the rest of the address is kept.
  const changeCountry = (next: string, previous: string, onChange: (value: string) => void) => {
    onChange(next)
    if (next === previous) return

    const clear = { shouldDirty: true }
    setValue("address.postalCode", "", clear)
    setValue("address.state", "", clear)
    setCepLookup("idle")
  }

  const cepHelperByLookup: Record<CepLookup, string> = {
    idle: t("myUnit.address.cepHelper"),
    notFound: t("myUnit.address.cepNotFound"),
    searching: t("myUnit.address.cepSearching"),
    unavailable: t("myUnit.address.cepUnavailable"),
  }

  return (
    <>
      {withCountry && (
        <Controller
          control={control}
          name="address.country"
          render={(controller) => (
            <Select
              error={controller.fieldState.error?.message}
              name={controller.field.name}
              onBlur={controller.field.onBlur}
              onChange={(option) =>
                changeCountry(option?.value ?? "", controller.field.value, controller.field.onChange)
              }
              options={countryOptions}
              placeholder={t("myUnit.address.countryPlaceholder")}
              title={t("myUnit.address.country")}
              value={countryOptions.find((option) => option.value === controller.field.value) ?? null}
              required
            />
          )}
          rules={{ required: requiredMessage }}
        />
      )}

      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          {isBrazilian ? (
            <Input
              key="cep"
              helperText={cepHelperByLookup[cepLookup]}
              mask="cep"
              title={t("myUnit.address.cep")}
              {...register("address.postalCode", { onChange: (event) => void lookUpCep(event.target.value) })}
            />
          ) : (
            <Input
              key="postalCode"
              maxLength={postalCodeMaxLength}
              title={t("myUnit.address.postalCode")}
              {...register("address.postalCode")}
            />
          )}
        </Grid.Col>
        <Grid.Col xs={12} md={8}>
          <Input
            maxLength={addressMaxLengths.street}
            title={t("myUnit.address.street")}
            {...register("address.street")}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          <Input
            error={errors.address?.number?.message}
            maxLength={addressMaxLengths.number}
            title={t("myUnit.address.number")}
            {...register("address.number", {
              pattern: { message: t("myUnit.validation.addressNumber"), value: addressNumberPattern },
            })}
          />
        </Grid.Col>
        <Grid.Col xs={12} md={8}>
          <Input
            maxLength={addressMaxLengths.complement}
            title={t("myUnit.address.complement")}
            {...register("address.complement")}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          <Input
            maxLength={addressMaxLengths.district}
            title={t("myUnit.address.district")}
            {...register("address.district")}
          />
        </Grid.Col>
        <Grid.Col xs={12} md={5}>
          <Input
            error={errors.address?.city?.message}
            maxLength={addressMaxLengths.city}
            title={t("myUnit.address.city")}
            required
            {...register("address.city", { validate: (value) => value.trim() !== "" || requiredMessage })}
          />
        </Grid.Col>
        <Grid.Col xs={12} md={3}>
          {isBrazilian ? (
            <Controller
              key="uf"
              control={control}
              name="address.state"
              render={(controller) => (
                <Select
                  error={controller.fieldState.error?.message}
                  name={controller.field.name}
                  onBlur={controller.field.onBlur}
                  onChange={(option) => controller.field.onChange(option?.value ?? "")}
                  options={stateOptions}
                  placeholder={t("myUnit.address.statePlaceholder")}
                  title={t("myUnit.address.state")}
                  value={stateOptions.find((option) => option.value === controller.field.value) ?? null}
                  required
                />
              )}
              rules={{ required: requiredMessage }}
            />
          ) : (
            <Input
              key="region"
              maxLength={regionMaxLength}
              title={t("myUnit.address.region")}
              {...register("address.state", { required: false })}
            />
          )}
        </Grid.Col>
      </Grid.Row>
    </>
  )
}
