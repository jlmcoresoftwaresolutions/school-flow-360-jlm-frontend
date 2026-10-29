import { createContext } from "react"

// How a form tells the nearest UnsavedChangesGuard whether it has unsaved changes, under an id of its
// own (several forms can be open at once). null outside any guard, where reporting does nothing.
export type ReportUnsavedChanges = (formId: string, hasUnsavedChanges: boolean) => void

export const UnsavedChangesContext = createContext<ReportUnsavedChanges | null>(null)
