import type { CSSProperties } from "react"
import { useId, useMemo, useState } from "react"
import type { DropdownIndicatorProps } from "react-select"
import ReactSelect, { components } from "react-select"

import { FieldLabel, FieldMessage, Icon } from "@/ds-components/atoms"
import { borderRadiusLevels, motion, radius, spacing } from "@/foundation"
import type { Country } from "@/utils/countries"
import { defaultCountry as fallbackCountry, getCountryOptions } from "@/utils/countries"
import { formatPhoneInput, getPhoneCallingCode, joinPhone, splitPhone } from "@/utils/phone"

import { getSelectStyles } from "../Select/Select.styles"
import { PhoneCountry, PhoneInputRow, PhoneInputWrapper, PhoneNumberInput } from "./PhoneInput.styles"

export type PhoneInputProps = {
  // The whole number in the international format, as it is saved, or "".
  value: string
  className?: string
  // The accessible name of the country selector.
  countryLabel?: string
  // The country selected while the number is empty (or can't be read).
  defaultCountry?: Country
  disabled?: boolean
  error?: string
  helperText?: string
  id?: string
  // The language the countries are named and sorted in.
  language?: string
  name?: string
  noOptionsMessage?: string
  placeholder?: string
  required?: boolean
  size?: "medium" | "small"
  style?: CSSProperties
  title?: string
  onBlur?: () => void
  // Called with the whole number in the international format ("+55 85 3333 1100"), or "" when empty.
  onChange: (value: string) => void
}

type CountryOption = {
  callingCode: string
  label: string
  value: Country
}

type PhoneState = {
  country: Country
  // The value this field last handed out: while the value it gets back is the same one, what was typed is
  // shown as it was typed; any other value (a reset, a value read later) is split again.
  emitted: string
  national: string
}

// The same chevron as the Select's, turning while the list is open.
const DropdownIndicator = (props: DropdownIndicatorProps<CountryOption, false>) => (
  <components.DropdownIndicator {...props}>
    <Icon
      color="secondary"
      name="chevron-down"
      size={16}
      style={{
        transform: props.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: `transform ${motion.duration.fast} ${motion.easing.ease}`,
      }}
    />
  </components.DropdownIndicator>
)

// A phone field of any country: a selector of the country (its calling code) on the left and the
// number on the right, one field with one label and one message. The person picks the country first,
// then types the number in the way that country writes it; the value going in and out is always the
// whole number in the international format, the one saved.
export const PhoneInput = (props: PhoneInputProps) => {
  const {
    className,
    countryLabel = "País do telefone",
    defaultCountry = fallbackCountry,
    disabled,
    error,
    helperText,
    id,
    language = "pt-BR",
    name,
    noOptionsMessage = "Nenhum país encontrado",
    onBlur,
    onChange,
    placeholder,
    required,
    size = "medium",
    style,
    title,
    value,
  } = props

  const generatedId = useId()

  const [state, setState] = useState<PhoneState>(() => ({ ...splitPhone(value, defaultCountry), emitted: value }))

  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const current = value === state.emitted ? state : { ...splitPhone(value, defaultCountry), emitted: value }
  const options = useMemo<CountryOption[]>(
    () =>
      getCountryOptions(language).map((option) => {
        const callingCode = getPhoneCallingCode(option.value)
        return { callingCode, label: `${option.label} (+${callingCode})`, value: option.value }
      }),
    [language],
  )
  const selected = options.find((option) => option.value === current.country) ?? null
  const selectStyles = getSelectStyles<CountryOption>({
    borderRadius: borderRadiusLevels.low,
    elevated: true,
    hasError: Boolean(error),
    size,
  })

  const emit = (country: Country, national: string) => {
    const next = joinPhone(national, country)
    setState({ country, emitted: next, national })
    onChange(next)
  }

  // A whole number typed or pasted with "+" and its calling code picks its own country; while it can't be
  // read yet, it is handed out as it is (and fails validation until it can).
  const changeNumber = (typed: string) => {
    if (!typed.trim().startsWith("+")) {
      emit(current.country, formatPhoneInput(typed, current.national, current.country))
      return
    }

    const split = splitPhone(typed, current.country)
    if (!split.national.startsWith("+")) {
      emit(split.country, split.national)
      return
    }

    setState({ country: current.country, emitted: typed, national: typed })
    onChange(typed)
  }

  return (
    <PhoneInputWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={inputId} required={required}>
          {title}
        </FieldLabel>
      )}
      <PhoneInputRow>
        <PhoneCountry $size={size}>
          <ReactSelect<CountryOption, false>
            aria-label={countryLabel}
            classNamePrefix="select"
            components={{ DropdownIndicator }}
            formatOptionLabel={(option, meta) =>
              meta.context === "value" ? `${option.value} +${option.callingCode}` : option.label
            }
            inputId={`${inputId}-country`}
            isDisabled={disabled}
            // Portaled like the Select's, so a Modal body never clips it.
            menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
            menuPosition="fixed"
            menuShouldBlockScroll
            noOptionsMessage={() => noOptionsMessage}
            onBlur={onBlur}
            onChange={(option) => {
              if (option) emit(option.value, current.national)
            }}
            options={options}
            styles={{
              ...selectStyles,
              control: (base, controlState) => ({
                ...selectStyles.control?.(base, controlState),
                borderBottomRightRadius: 0,
                borderTopRightRadius: 0,
              }),
              menu: (base, menuState) => ({
                ...selectStyles.menu?.(base, menuState),
                borderRadius: radius.md,
                minWidth: spacing[256],
              }),
            }}
            value={selected}
          />
        </PhoneCountry>
        <PhoneNumberInput
          $borderRadius={`0 ${borderRadiusLevels.low} ${borderRadiusLevels.low} 0`}
          $hasError={Boolean(error)}
          $size={size}
          aria-describedby={error || helperText ? messageId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="tel-national"
          disabled={disabled}
          id={inputId}
          inputMode="tel"
          name={name}
          onBlur={onBlur}
          onChange={(event) => changeNumber(event.target.value)}
          placeholder={placeholder}
          required={required}
          type="tel"
          value={current.national}
          $elevated
        />
      </PhoneInputRow>
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </PhoneInputWrapper>
  )
}
