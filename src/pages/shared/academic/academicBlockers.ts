// The backend describes what blocks or stops an academic action (the `blockers` of an impact, the
// `activationImpediments` of a class) as English sentences, not as codes. These are its sentences, each
// mapped to a key of the `academic.blockers` section with the count it carries; a sentence not known here
// is shown with a generic text, never in English.
export type AcademicBlockerKey =
  | "activeClassesInPeriod"
  | "activeEnrollments"
  | "activeGradesOfStage"
  | "activeOffersInUnit"
  | "activeOffersOfGrade"
  | "activeOffersOfKind"
  | "activeOffersOfSubject"
  | "capacityZero"
  | "classesOfOffer"
  | "classesOfRoom"
  | "classesOfSubject"
  | "enrollmentUnavailable"
  | "offerInactive"
  | "openTeacherLinks"
  | "openTeacherLinksOfSubject"
  | "periodClosed"
  | "roomInactive"
  | "unitInactive"
  | "unknown"

export type AcademicBlocker = {
  count?: number
  key: AcademicBlockerKey
  unitId?: number
}

const patterns: [RegExp, AcademicBlockerKey][] = [
  [/^(\d+) active class\(es\) in this period$/, "activeClassesInPeriod"],
  [/^(\d+) teacher link\(s\) for this subject that have not ended$/, "openTeacherLinksOfSubject"],
  [/^(\d+) teacher link\(s\) that have not ended/, "openTeacherLinks"],
  [/^(\d+) active grade\(s\) of this stage$/, "activeGradesOfStage"],
  [/^(\d+) active offer\(s\) of this grade$/, "activeOffersOfGrade"],
  [/^(\d+) active offer\(s\) that teach this subject$/, "activeOffersOfSubject"],
  [/^(\d+) class\(es\) that teach this subject$/, "classesOfSubject"],
  [/^(\d+) class\(es\) of this offer$/, "classesOfOffer"],
  [/^(\d+) class\(es\) that use this room$/, "classesOfRoom"],
  [/^(\d+) active enrollment\(s\)$/, "activeEnrollments"],
  [/^the enrollment source is not available/, "enrollmentUnavailable"],
  [/^active offers that depend on the period kind$/, "activeOffersOfKind"],
  [/^the unit is inactive$/, "unitInactive"],
  [/^the offer is inactive$/, "offerInactive"],
  [/^the period is closed$/, "periodClosed"],
  [/^the capacity must be above zero$/, "capacityZero"],
  [/^the room is inactive$/, "roomInactive"],
]

export const readAcademicBlocker = (text: string): AcademicBlocker => {
  const sentence = text.trim()

  const inUnit = /^active offers in unit (\d+)$/.exec(sentence)
  if (inUnit) return { key: "activeOffersInUnit", unitId: Number(inUnit[1]) }

  for (const [pattern, key] of patterns) {
    const match = pattern.exec(sentence)
    if (match) return match[1] ? { count: Number(match[1]), key } : { key }
  }

  return { key: "unknown" }
}

// The blockers of a 409 ACADEMIC_DEPENDENCY_ACTIVE (or a 422 ACADEMIC_NOT_ELIGIBLE) come in its message,
// after a colon and separated by commas or semicolons ("This change depends on regularizing: 2 active
// class(es) in this period, 1 teacher link(s) that have not ended."). A sentence may hold a comma of its
// own, so the list is only cut where the next sentence starts (a count, "the" or "active").
export const readDependencyMessage = (message: string | undefined): string[] => {
  if (!message) return []
  const list = message.includes(":") ? message.slice(message.indexOf(":") + 1) : message
  return list
    .trim()
    .replace(/\.$/, "")
    .split(/[;,]\s+(?=\d|the |active )/)
    .map((part) => part.trim())
    .filter(Boolean)
}
