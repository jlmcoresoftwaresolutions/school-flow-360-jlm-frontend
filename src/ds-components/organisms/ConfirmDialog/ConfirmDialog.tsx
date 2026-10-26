import type { ReactNode } from "react"

import { Button, Text } from "@/ds-components/atoms"

import { Modal } from "../Modal"

export type ConfirmDialogTone = "danger" | "default"

export type ConfirmDialogProps = {
  cancelLabel: string
  confirmLabel: string
  open: boolean
  title: string
  children?: ReactNode
  closeLabel?: string
  description?: string
  loading?: boolean
  tone?: ConfirmDialogTone
  onClose: () => void
  onConfirm: () => void
}

// A Modal that asks the user to confirm an action. Cancelling (the button, Escape, the X or the
// backdrop) all go through onClose; only the confirm button calls onConfirm. While `loading` the
// dialog can't be dismissed and both buttons are disabled, so the action can't be repeated or
// abandoned halfway. The danger tone is for destructive actions such as inactivating a unit.
// children render below the description, e.g. a reason field the action requires.
export const ConfirmDialog = (props: ConfirmDialogProps) => {
  const {
    cancelLabel,
    children,
    closeLabel,
    confirmLabel,
    description,
    loading = false,
    onClose,
    onConfirm,
    open,
    title,
    tone = "default",
  } = props

  const confirmColor = tone === "danger" ? "danger" : "brand"

  const handleClose = () => {
    if (!loading) onClose()
  }

  return (
    <Modal
      closeLabel={closeLabel}
      closeOnBackdropClick={!loading}
      footer={
        <>
          <Button color="secondary" disabled={loading} onClick={handleClose} variant="outlined">
            {cancelLabel}
          </Button>

          <Button color={confirmColor} disabled={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
      onClose={handleClose}
      open={open}
      size="sm"
      title={title}
    >
      {description && (
        <Text as="p" color="secondary" fontSize="sm">
          {description}
        </Text>
      )}

      {children}
    </Modal>
  )
}
