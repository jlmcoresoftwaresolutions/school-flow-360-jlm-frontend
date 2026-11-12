import type { FormEventHandler, ReactNode } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Icon } from "@/ds-components/atoms"

import { AnimatedHeightBox, AnimatedHeightContent, FieldGroup, FormActions, SwappedContent } from "../MyUnit.styles"
import { SectionCard } from "./SectionCard"
import { useAnimatedHeight } from "./useAnimatedHeight"

export type EditableSectionCardProps = {
  editing: boolean
  form: ReactNode
  title: string
  view: ReactNode
  onCancel: () => void
  onEdit: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  description?: string
  isDirty?: boolean
  isSubmitting?: boolean
}

// A section that is read first and edited in place: its own "Editar" swaps the read-only `view` for
// the `form` fields, with Cancelar/Salvar below them. Salvar stays off until something changed. The
// swap is animated: the section's height glides to the new content's (useAnimatedHeight), which fades
// in; nothing moves on the page's first render.
export const EditableSectionCard = (props: EditableSectionCardProps) => {
  const { description, editing, form, isDirty, isSubmitting, onCancel, onEdit, onSubmit, title, view } = props

  const { t } = useTranslation()
  const { contentRef, handleTransitionEnd, height, isAnimating } = useAnimatedHeight()

  // Whether the mode has changed at least once, so the first content shown doesn't fade in.
  const [hasSwapped, setHasSwapped] = useState(false)
  const [shownMode, setShownMode] = useState(editing)

  // Adjusting state while rendering (React's documented pattern for "state from a prop change").
  if (shownMode !== editing) {
    setShownMode(editing)
    setHasSwapped(true)
  }

  const editButton = (
    // Named after its section, since the page has one "Editar" per section.
    <Button
      aria-label={t("myUnit.editSection", { section: title })}
      onClick={onEdit}
      size="small"
      startIcon={<Icon color="brand" name="pen-outline" size={16} />}
      variant="outlined"
    >
      {t("common.edit")}
    </Button>
  )

  return (
    <SectionCard action={editing ? undefined : editButton} description={description} title={title}>
      <AnimatedHeightBox $isAnimating={isAnimating} onTransitionEnd={handleTransitionEnd} style={{ height }}>
        <AnimatedHeightContent ref={contentRef}>
          <SwappedContent key={editing ? "form" : "view"} $animate={hasSwapped}>
            {editing ? (
              <form aria-label={title} onSubmit={onSubmit} noValidate>
                <FieldGroup>{form}</FieldGroup>

                <FormActions>
                  <Button disabled={isSubmitting} onClick={onCancel} size="small" type="button" variant="outlined">
                    {t("common.cancel")}
                  </Button>
                  <Button disabled={!isDirty || isSubmitting} size="small" type="submit">
                    {t("common.save")}
                  </Button>
                </FormActions>
              </form>
            ) : (
              view
            )}
          </SwappedContent>
        </AnimatedHeightContent>
      </AnimatedHeightBox>
    </SectionCard>
  )
}
