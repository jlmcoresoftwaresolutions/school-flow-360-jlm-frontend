import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max"

import type { Country } from "../countries"
import { defaultCountry as fallbackCountry } from "../countries"
import { stripNonDigits } from "../formats"

// Phone numbers of any country, on libphonenumber-js (Google's libphonenumber rules) with the "max"
// metadata, the one that checks a number really exists in its country's plan (the smaller ones only
// check its length). A number without "+" is read as one of `defaultCountry`'s; with "+" and a country
// code, as that country's (the organization's country, in Minha Unidade). On screen a number of the
// default country is shown in its national format, any other in the international one; what is saved
// is always the international format.

// Formats what is being typed. A deletion that only removed a formatting character (a parenthesis,
// a space, a hyphen) also removes the digit before it, or the formatter would put that character
// right back and the number could never be erased.
export const formatPhoneInput = (value: string, previous = "", defaultCountry: Country = fallbackCountry): string => {
  let typed = value

  const onlyFormattingRemoved =
    value.length < previous.length && stripNonDigits(value) === stripNonDigits(previous) && value !== ""

  if (onlyFormattingRemoved) {
    const lastDigit = typed.search(/\d(?=\D*$)/)
    typed = lastDigit === -1 ? "" : typed.slice(0, lastDigit)
  }

  return new AsYouType(defaultCountry).input(typed)
}

export const isValidPhone = (value: string, defaultCountry: Country = fallbackCountry): boolean =>
  isValidPhoneNumber(value, defaultCountry)

// How a stored number is shown: national for the default country, international for any other, and
// as it is when it can't be read as a phone number (so nothing is ever changed by guessing).
export const formatPhoneForDisplay = (value: string, defaultCountry: Country = fallbackCountry): string => {
  const phone = parsePhoneNumberFromString(value, defaultCountry)
  if (!phone?.isValid()) return value

  return phone.country === defaultCountry ? phone.formatNational() : phone.formatInternational()
}

// How a number is saved: always international ("+55 85 3333 1100"). An empty value stays empty, and one
// that can't be read as a phone number is saved as it is.
export const toInternationalPhone = (value: string, defaultCountry: Country = fallbackCountry): string => {
  if (value.trim() === "") return ""

  const phone = parsePhoneNumberFromString(value, defaultCountry)

  return phone?.isValid() ? phone.formatInternational() : value
}
