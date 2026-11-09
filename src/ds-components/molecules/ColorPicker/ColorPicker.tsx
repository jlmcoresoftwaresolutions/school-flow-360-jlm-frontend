import type { ChangeEvent, CSSProperties } from "react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { createPortal } from "react-dom"

import { FieldLabel, FieldMessage } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType, spacing } from "@/foundation"
import { hexToRgb, type RgbColor, rgbToHex } from "@/utils/colors"
import { joinIds } from "@/utils/strings"

import { Input } from "../Input"
import {
  ColorPickerControl,
  ColorPickerPopover,
  ColorPickerWrapper,
  RgbFieldsRow,
  StyledHexColorInput,
  SwatchButton,
} from "./ColorPicker.styles"

const hexPattern = /^#[0-9a-fA-F]{6}$/

// Gap between the control row (swatch + hex input) and the popover once open, and the least it keeps
// from the viewport's edges - numeric because they feed a getBoundingClientRect()-based position
// rather than a CSS rule (see Tooltip.tsx for the same precedent).
const popoverGap = Number.parseInt(spacing[8], 10)
const viewportMargin = Number.parseInt(spacing[8], 10)

type ColorPickerOwnProps = {
  value: string
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  disabled?: boolean
  elevated?: boolean
  error?: string
  helperText?: string
  id?: string
  openLabel?: string
  style?: CSSProperties
  title?: string
  onChange?: (value: string) => void
}

export type ColorPickerProps = ColorPickerOwnProps

export const ColorPicker = (props: ColorPickerProps) => {
  const {
    borderRadius = "low",
    className,
    disabled,
    elevated = true,
    error,
    helperText,
    id,
    onChange,
    openLabel = "Abrir seletor de cor",
    style,
    title,
    value,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const controlRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const generatedId = useId()

  const [isOpen, setIsOpen] = useState(false)

  const colorPickerId = id ?? generatedId
  const messageId = `${colorPickerId}-message`

  useEffect(() => {
    if (!isOpen) return

    // The popover is portaled to document.body, outside the container, so a press inside it has to
    // be checked separately or it would count as "outside" and close the popover under the cursor.
    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("mousedown", handleOutsideMouseDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // The popover's size is only known once rendered, so it is placed in a layout effect, before the
  // browser paints: below the control, or above it when there is no room below (and there is above),
  // and shifted sideways to stay on screen. It follows the control while the page scrolls or the
  // window resizes, since it is fixed-positioned in document.body.
  useLayoutEffect(() => {
    if (!isOpen) return

    const placePopover = () => {
      const control = controlRef.current
      const popover = popoverRef.current
      if (!control || !popover) return

      const anchor = control.getBoundingClientRect()
      const { height, width } = popover.getBoundingClientRect()

      const below = anchor.bottom + popoverGap
      const above = anchor.top - popoverGap - height
      const fitsBelow = below + height <= window.innerHeight - viewportMargin
      const top = fitsBelow || above < viewportMargin ? below : above

      const left = Math.max(viewportMargin, Math.min(anchor.left, window.innerWidth - viewportMargin - width))

      popover.style.top = `${top}px`
      popover.style.left = `${left}px`
      popover.style.visibility = "visible"
    }

    placePopover()

    window.addEventListener("resize", placePopover)
    window.addEventListener("scroll", placePopover, true)

    return () => {
      window.removeEventListener("resize", placePopover)
      window.removeEventListener("scroll", placePopover, true)
    }
  }, [isOpen])

  const safeValue = hexPattern.test(value) ? value : "#000000"
  const rgb = hexToRgb(safeValue) ?? { b: 0, g: 0, r: 0 }

  const handleToggle = () => {
    if (disabled) return

    setIsOpen((current) => !current)
  }

  const handleRgbChange = (channel: keyof RgbColor) => (event: ChangeEvent<HTMLInputElement>) => {
    const channelValue = Number(event.target.value || 0)
    onChange?.(rgbToHex({ ...rgb, [channel]: channelValue }))
  }

  return (
    <ColorPickerWrapper className={className} ref={containerRef} style={style}>
      {title && <FieldLabel htmlFor={colorPickerId}>{title}</FieldLabel>}

      <ColorPickerControl ref={controlRef}>
        <SwatchButton
          $borderRadius={borderRadiusLevels[borderRadius]}
          $color={safeValue}
          $hasError={Boolean(error)}
          aria-expanded={isOpen}
          aria-label={openLabel}
          disabled={disabled}
          onClick={handleToggle}
          type="button"
        />

        <StyledHexColorInput
          $borderRadius={borderRadiusLevels[borderRadius]}
          $elevated={elevated}
          $hasError={Boolean(error)}
          aria-describedby={joinIds((error || helperText) && messageId)}
          aria-invalid={error ? true : undefined}
          color={value}
          disabled={disabled}
          id={colorPickerId}
          onChange={onChange}
          prefixed
        />
      </ColorPickerControl>

      {isOpen &&
        createPortal(
          <ColorPickerPopover ref={popoverRef}>
            <HexColorPicker color={safeValue} onChange={onChange} />

            <RgbFieldsRow>
              <Input
                disabled={disabled}
                maxLength={3}
                onChange={handleRgbChange("r")}
                size="small"
                style={{ width: spacing[64] }}
                title="R"
                value={String(rgb.r)}
                numeric
              />
              <Input
                disabled={disabled}
                maxLength={3}
                onChange={handleRgbChange("g")}
                size="small"
                style={{ width: spacing[64] }}
                title="G"
                value={String(rgb.g)}
                numeric
              />
              <Input
                disabled={disabled}
                maxLength={3}
                onChange={handleRgbChange("b")}
                size="small"
                style={{ width: spacing[64] }}
                title="B"
                value={String(rgb.b)}
                numeric
              />
            </RgbFieldsRow>
          </ColorPickerPopover>,
          document.body,
        )}

      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </ColorPickerWrapper>
  )
}
