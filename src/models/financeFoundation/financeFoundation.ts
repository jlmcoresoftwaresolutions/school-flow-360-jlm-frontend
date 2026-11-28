// The foundation of the financial module (EPIC 8, backend docs/P07_CONTRATO.md, Fatia 0): what the signed-in
// person may do there, and the stored result of a command by its intent. Money is always whole cents plus
// the currency, never a floating point.

// GET /api/finance/capabilities: for the client to draw its menus; the server decides again on every call.
// Everyone signed in gets an answer, all false without access. `wholeTenant`: the Admin (the unit lists are
// then empty). `self`: a Responsável or an adult student who is the financial party of an obligation.
export type FinanceCapabilities = {
  communicate: boolean
  currency: string
  export: boolean
  operate: boolean
  operateUnitIds: number[] | null
  read: boolean
  readOperations: boolean
  readUnitIds: number[] | null
  self: boolean
  wholeTenant: boolean
}

// GET /api/finance/commands/{intentId}: what an intent already produced, for a client that lost the answer.
export type FinanceCommand = {
  commandType: string
  completedAt: string | null
  intentId: string
  result: unknown
  status: string
}
