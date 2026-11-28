import { useSignedInUser } from "@/hooks"
import { hasAnyRole } from "@/utils/access"

import { useAcademicUnits } from "../academic/useAcademicUnits"
import type { DirectoryUnit } from "../userAccess/useUnitDirectory"

export type FinanceAccess = {
  // The Admin and the Financeiro operate (in the Financeiro's units); the server checks every call again.
  operates: boolean
  // Who reads the titles: the Admin, the Financeiro and the Secretaria (only reading).
  readsTitles: boolean
  // Who reads the payments and the receipts: the Admin and the Financeiro (never the Secretaria).
  readsOperations: boolean
  // Every unit the person knows, for the filters and to name a unit.
  units: DirectoryUnit[]
}

// Who does what in the financial module (matrix MVP-0207 to 0235): the Admin in the whole institution, the
// Financeiro operating in its units, the Secretaria only reading the titles. The Coordenação and the
// Professor see nothing; the Responsável and the adult student see only their own titles (another page).
export const useFinanceAccess = (): FinanceAccess => {
  const signedIn = useSignedInUser()
  const { units } = useAcademicUnits()

  const operates = hasAnyRole(signedIn, ["ADMIN", "FINANCEIRO"])

  return {
    operates,
    readsOperations: operates,
    readsTitles: hasAnyRole(signedIn, ["SECRETARIA", "FINANCEIRO"]),
    units,
  }
}
