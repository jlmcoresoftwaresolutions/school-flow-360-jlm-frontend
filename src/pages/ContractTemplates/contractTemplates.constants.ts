// The backend's limits for a contract model: a title up to 160 characters, a text up to 60,000, and a
// legal approval reference up to 200.
export const templateLimits = { body: 60000, legalApprovalRef: 200, title: 160 }

// The controlled fields a model may use as {{field}} (the backend's ContractFields). A new model is
// written against these; an existing one comes with its own `allowedFields`. No financial field exists
// yet: a model that asks for one is refused.
export const contractFields = [
  "institution.name",
  "unit.name",
  "student.name",
  "student.code",
  "signatories",
  "class.name",
  "class.code",
  "stage.name",
  "grade.name",
  "period.name",
  "period.start",
  "period.end",
  "start.date",
]
