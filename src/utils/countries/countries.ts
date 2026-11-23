import type { CountryCode } from "libphonenumber-js/max"
import { getCountries } from "libphonenumber-js/max"

import { normalizeForSearch } from "../strings"

// Countries as ISO 3166-1 alpha-2 codes ("BR", "PT", "US"), the form an address keeps. Their names
// come from the browser (Intl.DisplayNames), in whichever language is asked, so no list of names is
// kept here. The codes are the ones libphonenumber-js knows, so every country picked for an address
// also drives its phones.

export type Country = CountryCode

// The country an address or a phone belongs to when nothing says otherwise.
export const defaultCountry: Country = "BR"

const countryCodes = getCountries()

// The languages a stored country name is recognized in: the ones the app is translated to.
const nameLanguages = ["pt-BR", "pt-PT", "en", "es", "fr"]

export const isCountry = (value: string): value is Country => (countryCodes as string[]).includes(value)

// The country's name in `language` ("Brasil", "Brazil"), or the code itself where the browser has no
// name for it.
export const getCountryName = (code: Country, language: string): string => {
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

// Every country, named in `language` and in that language's alphabetical order, for a country field.
export const getCountryOptions = (language: string): { label: string; value: Country }[] =>
  countryCodes
    .map((code) => ({ label: getCountryName(code, language), value: code }))
    .sort((first, second) => first.label.localeCompare(second.label, language))

// Reads a stored country, which the backend keeps as free text: a code ("BR", "br") or a name in one
// of the app's languages ("Brasil", "Brazil", "brasil"), ignoring case and accents. Undefined when it
// can't be recognized (an empty value included), so the caller can keep the text as it was.
export const toCountry = (value: string): Country | undefined => {
  const trimmed = value.trim()
  if (trimmed === "") return undefined

  const asCode = trimmed.toUpperCase()
  if (isCountry(asCode)) return asCode

  const wanted = normalizeForSearch(trimmed)

  return countryCodes.find((code) =>
    nameLanguages.some((language) => normalizeForSearch(getCountryName(code, language)) === wanted),
  )
}

// The country of whoever is using the app, from the regions of the browser's languages ("pt-BR" is
// Brazil, "en-US" the United States); a language without a region ("pt") gives its most likely one
// ("BR"). Nothing is asked to any service. Undefined when no language points to a known country.
export const detectCountry = (
  languages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages,
): Country | undefined => {
  const regionOf = (tag: string, maximize: boolean) => {
    try {
      const locale = new Intl.Locale(tag)
      return (maximize ? locale.maximize() : locale).region
    } catch {
      return undefined
    }
  }

  for (const maximize of [false, true]) {
    for (const tag of languages) {
      const region = regionOf(tag, maximize)
      if (region && isCountry(region)) return region
    }
  }

  return undefined
}
