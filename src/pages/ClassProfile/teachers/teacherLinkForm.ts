import { useSignedInUser } from "@/hooks"
import { hasAnyRole } from "@/utils/access"
import { toIsoDate } from "@/utils/dates"

// Today as the backend compares the dates of a link (inclusive on both ends).
export const todayIso = () => toIsoDate(new Date())

// Whether the signed-in person may give a link a start or an end in the past: only the Admin and the
// Coordenação of the class's unit, always with a reason (the Secretaria is refused, 403). The backend
// checks it again.
export const useCanBackdate = (unitId: number) => {
  const signedIn = useSignedInUser()

  if (hasAnyRole(signedIn, ["ADMIN"])) return true

  return (signedIn?.assignments ?? []).some(
    (assignment) => assignment.role === "COORDENACAO" && assignment.status === "ACTIVE" && assignment.unitId === unitId,
  )
}
