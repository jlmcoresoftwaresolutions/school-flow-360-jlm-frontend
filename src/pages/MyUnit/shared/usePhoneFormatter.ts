import { formatPhoneForDisplay } from "@/utils/phone"

import { useOrganizationCountry } from "./organizationCountry"

// A stored phone the way Minha Unidade shows it: national for a number of the organization's country,
// international for any other.
export const usePhoneFormatter = () => {
  const country = useOrganizationCountry()

  return (phone: string) => formatPhoneForDisplay(phone, country)
}
