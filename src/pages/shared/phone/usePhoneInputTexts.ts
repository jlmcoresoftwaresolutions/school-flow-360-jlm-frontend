import { useTranslation } from "react-i18next"

// The texts a PhoneInput takes in the person's language: the name of its country selector, the message
// of a country search with no match and the language the countries are named and sorted in.
export const usePhoneInputTexts = () => {
  const { i18n, t } = useTranslation()

  return {
    countryLabel: t("common.phoneCountry"),
    language: i18n.language,
    noOptionsMessage: t("common.noCountries"),
  }
}
