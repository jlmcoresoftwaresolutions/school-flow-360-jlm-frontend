import { useState } from "react"
import type { DefaultValues, FieldValues } from "react-hook-form"
import { useForm } from "react-hook-form"

import { useUnsavedChanges } from "@/components"

import type { SaveResult } from "./saveResult"

// The read -> edit -> save cycle of an EditableSectionCard, over a react-hook-form form. Editing
// starts from the current values, Cancelar drops the draft, and a changed draft counts as unsaved
// (see UnsavedChangesGuard). Only a "saved" save takes the section back to reading; a failed one keeps
// the draft on screen, and a "conflict" (someone else changed the record first) keeps it too, with
// `hasConflict` on until the user saves again, discards the draft or cancels.
export const useSectionForm = <T extends FieldValues>(currentValues: T, save: (values: T) => Promise<SaveResult>) => {
  const form = useForm<T>({ defaultValues: currentValues as DefaultValues<T> })

  const [isEditing, setIsEditing] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)

  const { isDirty, isSubmitting } = form.formState

  useUnsavedChanges(isEditing && isDirty)

  const startEditing = () => {
    form.reset(currentValues)
    setHasConflict(false)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setHasConflict(false)
    setIsEditing(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await save(values)

    setHasConflict(result === "conflict")
    if (result === "saved") setIsEditing(false)
  })

  return { cancelEditing, form, hasConflict, isDirty, isEditing, isSubmitting, onSubmit, startEditing }
}
