import { useNavigate } from "react-router-dom"

import { getSchoolAddress } from "@/utils/tenant"

// Goes on to another page of the school an e-mail's link carries, after the page it opened is done
// (the invitation accepted, the password reset): inside the app when the address opened is the
// school's, and to the school's own address otherwise (see SchoolLink).
export const useGoToSchool = () => {
  const navigate = useNavigate()

  return (tenantId: string, path: string) => {
    const address = getSchoolAddress(tenantId, path)
    if (address) {
      window.location.assign(address)
      return
    }

    navigate(path, { replace: true })
  }
}
