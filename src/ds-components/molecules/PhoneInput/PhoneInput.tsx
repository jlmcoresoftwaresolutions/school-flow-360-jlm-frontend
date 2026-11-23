import type { ComponentType, CSSProperties, SVGAttributes } from "react"
import { createContext, useContext, useEffect, useId, useMemo, useState } from "react"
import type { DropdownIndicatorProps, InputProps } from "react-select"
import ReactSelect, { components } from "react-select"

import { FieldLabel, FieldMessage, Icon } from "@/ds-components/atoms"
import { borderRadiusLevels, motion, radius, spacing } from "@/foundation"
import type { Country } from "@/utils/countries"
import { defaultCountry as fallbackCountry, detectCountry, getCountryOptions } from "@/utils/countries"
import {
  fitPhoneDigits,
  formatPhoneInput,
  getPhoneCallingCode,
  getPhoneExample,
  joinPhone,
  splitPhone,
} from "@/utils/phone"

import { getSelectStyles } from "../Select/Select.styles"
import {
  PhoneCountry,
  PhoneCountryFlag,
  PhoneCountryOption,
  PhoneInputRow,
  PhoneInputWrapper,
  PhoneNumberInput,
} from "./PhoneInput.styles"

export type PhoneInputProps = {
  // The whole number in the international format, as it is saved, or "".
  value: string
  className?: string
  // The accessible name of the country selector.
  countryLabel?: string
  // The country selected while the number is empty (or can't be read). Without it, the country of whoever
  // uses the field, from the browser's languages (Brazil when they point to none).
  defaultCountry?: Country
  disabled?: boolean
  error?: string
  helperText?: string
  id?: string
  // The language the countries are named and sorted in.
  language?: string
  name?: string
  noOptionsMessage?: string
  // Without it, an example number of the selected country, written the way that country writes it.
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
  name: string
  value: Country
}

type PhoneState = {
  country: Country
  // The value this field last handed out: while the value it gets back is the same one, what was typed is
  // shown as it was typed; any other value (a reset, a value read later) is split again.
  emitted: string
  national: string
}

// Every country's flag, as an SVG component by its code ("BR"): emoji flags don't show on Windows. The
// set is big, so it is a chunk of its own, loaded once the first phone field shows and then kept.
type FlagSet = Record<string, ComponentType<SVGAttributes<SVGElement>>>

let flagSet: Promise<FlagSet> | undefined

const loadFlags = async (): Promise<FlagSet> => {
  flagSet ??= import("country-flag-icons/react/3x2") as unknown as Promise<FlagSet>

  return flagSet
}

// The same chevron as the Select's, turning while the list is open.
// The field's size reaches the chevron through this context, to shrink it with the field.
const PhoneSizeContext = createContext<"medium" | "small">("medium")

const DropdownIndicator = (props: DropdownIndicatorProps<CountryOption, false>) => {
  const size = useContext(PhoneSizeContext)

  return (
    <components.DropdownIndicator {...props}>
      <Icon
        color="secondary"
        name="chevron-down"
        size={size === "small" ? 12 : 16}
        style={{
          transform: props.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: `transform ${motion.duration.fast} ${motion.easing.ease}`,
        }}
      />
    </components.DropdownIndicator>
  )
}

// The country search is not where the phone goes: a search field, marked for password managers and form
// fillers to leave alone (each reads its own attribute) and named without the word "phone", so their
// icon and suggestion land on the number.
const CountrySearch = (props: InputProps<CountryOption, false>) => (
  <components.Input
    {...props}
    data-1p-ignore="true"
    data-bwignore="true"
    data-form-type="other"
    data-lpignore="true"
    type="search"
  />
)

// A phone field of any country: a selector of the country on the left (closed, its flag and calling
// code) and the number on the right, one field with one label and one message. The country starts as
// the one of whoever uses the field (from the browser), unless `defaultCountry` or the value says
// otherwise. The number follows the selected country like a mask: formatted the way it writes numbers,
// never longer than its longest one, with one of its numbers as the placeholder; choosing another
// country clears it. The value going in and out is always the whole number in the international
// format, the one saved.
export const PhoneInput = (props: PhoneInputProps) => {
  const {
    className,
    countryLabel = "Código do país (DDI)",
    defaultCountry,
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

  const [startCountry] = useState<Country>(() => defaultCountry ?? detectCountry() ?? fallbackCountry)
  const [flags, setFlags] = useState<FlagSet | null>(null)
  const [state, setState] = useState<PhoneState>(() => ({ ...splitPhone(value, startCountry), emitted: value }))

  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const current = value === state.emitted ? state : { ...splitPhone(value, startCountry), emitted: value }
  const options = useMemo<CountryOption[]>(
    () =>
      getCountryOptions(language).map((option) => {
        const callingCode = getPhoneCallingCode(option.value)
        return { callingCode, label: `${option.label} (+${callingCode})`, name: option.label, value: option.value }
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

  // The flags, loaded once for every phone field and shown as soon as they arrive.
  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await loadFlags()
        if (!isStale) setFlags(loaded)
      } catch {
        // Without the flags, the countries are still named and their codes shown.
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [])

  const emit = (country: Country, national: string) => {
    const next = joinPhone(national, country)
    setState({ country, emitted: next, national })
    onChange(next)
  }

  // A whole number typed or pasted with "+" and its calling code picks its own country; while it can't be
  // read yet, it is handed out as it is (and fails validation until it can).
  const changeNumber = (typed: string) => {
    if (!typed.trim().startsWith("+")) {
      emit(current.country, fitPhoneDigits(formatPhoneInput(typed, current.national, current.country), current.country))
      return
    }

    const split = splitPhone(typed, current.country)
    if (!split.national.startsWith("+")) {
      emit(split.country, fitPhoneDigits(split.national, split.country))
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
        <PhoneCountry $codeLength={selected?.callingCode.length ?? 2} $size={size}>
          <PhoneSizeContext.Provider value={size}>
            <ReactSelect<CountryOption, false>
              aria-label={countryLabel}
              classNamePrefix="select"
              components={{ DropdownIndicator, Input: CountrySearch }}
              formatOptionLabel={(option, meta) => {
                const Flag = flags?.[option.value]
                const isValue = meta.context === "value"

                // Closed: the flag and the calling code, with the country's name on hover.
                return (
                  <PhoneCountryOption title={isValue ? option.name : undefined}>
                    <PhoneCountryFlag aria-hidden="true">{Flag && <Flag />}</PhoneCountryFlag>
                    {isValue ? `+${option.callingCode}` : option.label}
                  </PhoneCountryOption>
                )
              }}
              inputId={`${inputId}-country`}
              isDisabled={disabled}
              // Portaled like the Select's, so a Modal body never clips it.
              menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
              menuPosition="fixed"
              menuShouldBlockScroll
              noOptionsMessage={() => noOptionsMessage}
              onBlur={onBlur}
              // Another country has other numbers: what was typed is cleared.
              onChange={(option) => {
                if (option && option.value !== current.country) emit(option.value, "")
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
          </PhoneSizeContext.Provider>
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
          placeholder={placeholder ?? getPhoneExample(current.country)}
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
