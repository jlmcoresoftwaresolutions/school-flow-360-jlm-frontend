import type { IconName } from "@/ds-components/atoms"
import type { PathsType } from "@/routes/paths"

// The main areas the home page presents, each a card with a button to its page. Only the ones whose
// page the person may open are shown (pageRoles, the same rule as the menu); the text of each is under
// home.features.<key> in the locales.
export type HomeFeature = {
  icon: IconName
  key: "academic" | "audit" | "calendar" | "enrollments" | "myOrganization" | "people" | "users"
  page: keyof PathsType
}

export const homeFeatures: HomeFeature[] = [
  { icon: "building-outline", key: "myOrganization", page: "myOrganization" },
  { icon: "school-outline", key: "people", page: "students" },
  { icon: "contract-outline", key: "enrollments", page: "enrollments" },
  { icon: "class-outline", key: "academic", page: "academicOverview" },
  { icon: "calendar-outline", key: "calendar", page: "academicCalendar" },
  { icon: "users-outline", key: "users", page: "userList" },
  { icon: "shield-outline", key: "audit", page: "audit" },
]

// The three ideas the introduction stands on, each with its icon; the text is under home.pillars.<key>.
export const homePillars: { icon: IconName; key: "allInOne" | "rightAccess" | "yourSchool" }[] = [
  { icon: "hub-outline", key: "allInOne" },
  { icon: "shield-user-outline", key: "rightAccess" },
  { icon: "palette-outline", key: "yourSchool" },
]
