import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBlocker } from "react-router-dom"

import { ConfirmDialog } from "@/ds-components/organisms"

import { UnsavedChangesContext } from "./unsavedChangesContext"

export type UnsavedChangesGuardProps = {
  children: ReactNode
}

// Wraps the pages behind the login (see AppShell). While any form inside reports unsaved changes
// (useUnsavedChanges), leaving for another page - a link, the menu, the browser's back button, signing
// out - stops at a centered dialog: keep editing, or leave and lose them. Reloading or closing the tab
// can only get the browser's own prompt (no page may replace it). Being part of the app shell rather
// than the design system, it translates its own copy, like GlobalLoading.
export const UnsavedChangesGuard = (props: UnsavedChangesGuardProps) => {
  const { children } = props

  const { t } = useTranslation()

  const [dirtyFormIds, setDirtyFormIds] = useState<ReadonlySet<string>>(() => new Set())

  const hasUnsavedChanges = dirtyFormIds.size > 0

  const reportUnsavedChanges = useCallback((formId: string, isDirty: boolean) => {
    setDirtyFormIds((current) => {
      if (current.has(formId) === isDirty) return current

      const next = new Set(current)
      if (isDirty) next.add(formId)
      else next.delete(formId)

      return next
    })
  }, [])

  // Only a change of page counts: a navigation that stays on the same path and query doesn't leave.
  const blocker = useBlocker((transition) => {
    const { currentLocation, nextLocation } = transition

    return (
      hasUnsavedChanges &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
    )
  })

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    window.addEventListener("beforeunload", warnBeforeUnload)

    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <UnsavedChangesContext.Provider value={reportUnsavedChanges}>
      {children}

      <ConfirmDialog
        cancelLabel={t("unsavedChanges.stay")}
        closeLabel={t("common.close")}
        confirmLabel={t("unsavedChanges.leave")}
        description={t("unsavedChanges.description")}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        open={blocker.state === "blocked"}
        title={t("unsavedChanges.title")}
        tone="danger"
      />
    </UnsavedChangesContext.Provider>
  )
}
