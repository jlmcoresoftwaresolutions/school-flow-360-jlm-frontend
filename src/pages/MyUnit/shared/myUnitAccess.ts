import { createContext, useContext } from "react"

// Whether the signed-in user manages the organization (an Admin) or only reads it (a Secretaria, which
// sees the organization's summary, its own units and the published identity, and changes none of them:
// matrix ORG-M01 to M04). Every edit control of Minha Unidade follows it; the backend refuses any write
// from a reader anyway.
export const MyUnitAccessContext = createContext<"manage" | "read">("manage")

export const useCanManageMyUnit = () => useContext(MyUnitAccessContext) === "manage"
