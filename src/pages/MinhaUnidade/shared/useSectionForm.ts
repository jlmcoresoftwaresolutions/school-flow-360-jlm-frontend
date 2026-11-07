import { useState } from "react"
import type { DefaultValues, FieldValues } from "react-hook-form"
import { useForm } from "react-hook-form"

import { useUnsavedChanges } from "@/components"

// The read -> edit -> save cycle of an EditableSectionCard, over a react-hook-form form. Editing
// starts from the current values, Cancelar drops the draft, and a changed draft counts as unsaved
// (see UnsavedChangesGuard). `save` resolves to whether it worked: only then does the section go back
// to reading; a failed save keeps the draft on screen.
export const useSectionForm = <T extends FieldValues>(currentValues: T, save: (values: T) => Promise<boolean>) => {
  const form = useForm<T>({ defaultValues: currentValues as DefaultValues<T> })

  const [isEditing, setIsEditing] = useState(false)

  const { isDirty, isSubmitting } = form.formState

  useUnsavedChanges(isEditing && isDirty)

  const startEditing = () => {
    form.reset(currentValues)
    setIsEditing(true)
  }

  const cancelEditing = () => setIsEditing(false)

  const onSubmit = form.handleSubmit(async (values) => {
    if (await save(values)) setIsEditing(false)
  })

  return { cancelEditing, form, isDirty, isEditing, isSubmitting, onSubmit, startEditing }
}
