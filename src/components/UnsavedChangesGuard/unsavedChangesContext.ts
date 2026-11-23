import { createContext } from "react"

// How a form tells the nearest UnsavedChangesGuard whether it has unsaved changes, under an id of its
// own (several forms can be open at once). null outside any guard, where reporting does nothing.
export type ReportUnsavedChanges = (formId: string, hasUnsavedChanges: boolean) => void

export const UnsavedChangesContext = createContext<ReportUnsavedChanges | null>(null)

// The navigation state of a page that leaves right after saving (e.g. a form page opening the record it
// saved): the guard lets it through, since the form may still count as changed until it re-renders.
export const leavingAfterSave = { leavingAfterSave: true }
