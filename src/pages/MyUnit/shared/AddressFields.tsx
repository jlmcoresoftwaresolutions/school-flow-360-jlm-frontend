import { useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Grid } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Input, Select } from "@/ds-components/molecules"
import type { Address } from "@/models"
import { getAddressByCep } from "@/services/viaCep"
import { brazilianStates } from "@/utils/address"
import { stripNonDigits } from "@/utils/formats"

// Any form holding an address under `address` (the organization's and a unit's).
export type AddressFormValues = {
  address: Address
}

type CepLookup = "idle" | "notFound" | "searching" | "unavailable"

const stateOptions: SelectOption[] = brazilianStates.map((state) => ({ label: state, value: state }))

// The address fields of a react-hook-form form (read through its FormProvider). Typing a full CEP
// looks it up (ViaCEP) and fills the street, district, city and state, which stay editable; a CEP not
// found, or a lookup that fails, only says so - the address can always be filled in by hand. The city
// and the state are required.
export const AddressFields = () => {
  const { t } = useTranslation()
  const { control, formState, register, setValue } = useFormContext<AddressFormValues>()

  const [cepLookup, setCepLookup] = useState<CepLookup>("idle")

  const { errors } = formState
  const requiredMessage = t("myUnit.validation.required")

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

  const cepHelperByLookup: Record<CepLookup, string> = {
    idle: t("myUnit.address.cepHelper"),
    notFound: t("myUnit.address.cepNotFound"),
    searching: t("myUnit.address.cepSearching"),
    unavailable: t("myUnit.address.cepUnavailable"),
  }

  return (
    <>
      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          <Input
            helperText={cepHelperByLookup[cepLookup]}
            mask="cep"
            title={t("myUnit.address.cep")}
            {...register("address.cep", { onChange: (event) => void lookUpCep(event.target.value) })}
          />
        </Grid.Col>
        <Grid.Col xs={12} md={8}>
          <Input title={t("myUnit.address.street")} {...register("address.street")} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          <Input title={t("myUnit.address.number")} {...register("address.number")} />
        </Grid.Col>
        <Grid.Col xs={12} md={8}>
          <Input title={t("myUnit.address.complement")} {...register("address.complement")} />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row>
        <Grid.Col xs={12} md={4}>
          <Input title={t("myUnit.address.district")} {...register("address.district")} />
        </Grid.Col>
        <Grid.Col xs={12} md={5}>
          <Input
            error={errors.address?.city?.message}
            title={t("myUnit.address.city")}
            required
            {...register("address.city", { validate: (value) => value.trim() !== "" || requiredMessage })}
          />
        </Grid.Col>
        <Grid.Col xs={12} md={3}>
          <Controller
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
        </Grid.Col>
      </Grid.Row>
    </>
  )
}
