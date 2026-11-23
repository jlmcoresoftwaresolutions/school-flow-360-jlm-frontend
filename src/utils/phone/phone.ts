import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max"

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

// The country's calling code, without the "+" ("55" for Brazil).
export const getPhoneCallingCode = (country: Country): string => getCountryCallingCode(country)

// The country of a calling code: `preferred` when it shares the code (Canada and the United States both
// use 1), otherwise the first country that uses it.
const countryOfCallingCode = (callingCode: string, preferred: Country): Country | undefined => {
  if (getCountryCallingCode(preferred) === callingCode) return preferred

  return getCountries().find((country) => getCountryCallingCode(country) === callingCode)
}

// A number kept in the international format, split for a field that picks its country apart from the
// rest (the PhoneInput): the country and the national part, formatted as that country writes it. An
// empty value gives `fallback` and nothing typed; one that can't be read keeps `fallback` and the value
// as it is, so nothing is lost.
export const splitPhone = (
  value: string,
  fallback: Country = fallbackCountry,
): { country: Country; national: string } => {
  if (value.trim() === "") return { country: fallback, national: "" }

  const phone = parsePhoneNumberFromString(value, fallback)
  // Without "+" only a valid number is read (a stored one from before the international format); anything
  // else is kept as it was typed.
  const isInternational = value.trim().startsWith("+")
  if (!phone || (!isInternational && !phone.isValid())) return { country: fallback, national: value }

  const country = phone.country ?? countryOfCallingCode(phone.countryCallingCode, fallback) ?? fallback
  const national = phone.country ? phone.formatNational() : new AsYouType(country).input(phone.nationalNumber)

  return { country, national }
}

// The number a country and a national part make, in the international format ("+55 85 3333 1100"), as
// it is saved; partial while it is being typed, and empty when there is no digit.
export const joinPhone = (national: string, country: Country): string => {
  const digits = stripNonDigits(national)
  if (digits === "") return ""

  const formatter = new AsYouType(country)
  formatter.input(digits)
  const number = formatter.getNumber()

  return number ? number.formatInternational() : `+${getCountryCallingCode(country)} ${digits}`
}
