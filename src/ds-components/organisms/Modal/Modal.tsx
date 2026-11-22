import type { CSSProperties, MouseEvent, ReactNode } from "react"
import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"

import { IconButton, Text } from "@/ds-components/atoms"
import { getFocusableElements } from "@/utils/focus"

import type { ModalSize } from "./Modal.styles"
import {
  StyledModalBody,
  StyledModalDialog,
  StyledModalFooter,
  StyledModalHeader,
  StyledModalHeaderActions,
  StyledModalOverlay,
} from "./Modal.styles"

export type ModalProps = {
  children: ReactNode
  open: boolean
  title: string
  className?: string
  closeLabel?: string
  closeOnBackdropClick?: boolean
  footer?: ReactNode
  headerAction?: ReactNode
  size?: ModalSize
  style?: CSSProperties
  onClose: () => void
}

// A dialog over the whole page. While open it behaves like a real modal: focus moves in and is kept
// inside (Tab wraps), the page behind doesn't scroll, Escape and a click on the backdrop ask to close
// (onClose - the owner decides, it is a controlled component), and focus returns to whatever opened it.
// The X button in the header is always rendered, so every modal has a way out; closeLabel is its
// accessible name, in pt-BR by default, and a page passes the translated one.
export const Modal = (props: ModalProps) => {
  const {
    children,
    className,
    closeLabel = "Fechar",
    closeOnBackdropClick = true,
    footer,
    headerAction,
    onClose,
    open,
    size = "md",
    style,
    title,
  } = props

  const dialogRef = useRef<HTMLDivElement>(null)

  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current

    document.body.style.overflow = "hidden"

    // The first thing inside, or the dialog itself when it has nothing focusable (it has tabIndex -1).
    const initialFocus = dialog ? (getFocusableElements(dialog)[0] ?? dialog) : null
    initialFocus?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Escape belongs to the menu or list open under the focus (an ActionMenu, a Select): it closes
        // that, and only the next one closes the modal.
        const target = event.target
        const isInOpenPopup =
          target instanceof Element &&
          (target.closest("[role='menu']") !== null || target.getAttribute("aria-expanded") === "true")

        if (!isInOpenPopup) onClose()
        return
      }

      const dialog = dialogRef.current
      if (event.key !== "Tab" || !dialog) return

      const focusable = getFocusableElements(dialog)

      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const isOutside = !dialog.contains(active)

      if (event.shiftKey && (active === first || isOutside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || isOutside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  // mousedown, not click: a drag that starts inside the dialog (selecting text) and is released on
  // the backdrop would otherwise count as a click on the backdrop and close it.
  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <StyledModalOverlay onMouseDown={handleOverlayMouseDown}>
      <StyledModalDialog
        $size={size}
        aria-labelledby={titleId}
        aria-modal="true"
        className={className}
        ref={dialogRef}
        role="dialog"
        style={style}
        tabIndex={-1}
      >
        <StyledModalHeader>
          <Text as="h2" fontSize="xl" id={titleId} semibold>
            {title}
          </Text>

          <StyledModalHeaderActions>
            {headerAction}
            <IconButton icon="x" label={closeLabel} onClick={onClose} size="small" tooltip="" />
          </StyledModalHeaderActions>
        </StyledModalHeader>

        <StyledModalBody>{children}</StyledModalBody>

        {footer && <StyledModalFooter>{footer}</StyledModalFooter>}
      </StyledModalDialog>
    </StyledModalOverlay>,
    document.body,
  )
}
