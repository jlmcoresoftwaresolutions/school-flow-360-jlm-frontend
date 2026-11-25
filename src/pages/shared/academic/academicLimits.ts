// The backend's limits for the academic structure (P04, PT-DADOS-01): a name of 1 to 150 characters, a
// code of 1 to 30 (compared without accents or case) and a reason or description of up to 500.
// The largest page the backend gives (PageParams: `size` from 1 to 100; more answers 400). A list read
// whole for a select or a lookup asks for this, never more.
export const academicMaxPageSize = 100

export const academicLimits = {
  code: 30,
  name: 150,
  reason: 500,
}
