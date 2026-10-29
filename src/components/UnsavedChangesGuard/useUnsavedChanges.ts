import { useContext, useEffect, useId } from "react"

import { UnsavedChangesContext } from "./unsavedChangesContext"

// Called by a form with whether it has unsaved changes (typically: in edit mode and different from
// what it started with). While it does, leaving the page asks for confirmation first - see
// UnsavedChangesGuard. A form that unmounts stops counting.
export const useUnsavedChanges = (hasUnsavedChanges: boolean): void => {
  const reportUnsavedChanges = useContext(UnsavedChangesContext)
  const formId = useId()

  useEffect(() => {
    reportUnsavedChanges?.(formId, hasUnsavedChanges)

    return () => reportUnsavedChanges?.(formId, false)
  }, [formId, hasUnsavedChanges, reportUnsavedChanges])
}
