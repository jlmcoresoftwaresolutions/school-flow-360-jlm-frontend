import { getAgeInYears } from "@/utils/dates"

// The age from which a student no longer needs a guardian to be active (DP-P03-02).
export const adultAge = 18

// Under 18 on the day, by the birth date only (the backend's rule; a missing birth date counts as a
// minor, the safe side). The screen only uses it to warn ahead: the backend decides.
export const isMinor = (birthDate: string | null): boolean => !birthDate || getAgeInYears(birthDate) < adultAge
