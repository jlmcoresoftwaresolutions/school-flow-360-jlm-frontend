import type { ChangeEvent, CSSProperties } from "react"
import { useEffect, useId, useRef, useState } from "react"
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

// Gap between the control row (swatch + hex input) and the popover once open, numeric because it
// feeds a getBoundingClientRect()-based position rather than a CSS rule - see Grid.tsx's own
// defaultGutterWidth for the same spacing-token-to-number precedent.
const popoverGap = Number.parseInt(spacing[8], 10)

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

type PopoverPosition = {
  left: number
  top: number
}

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
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null)

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

  const safeValue = hexPattern.test(value) ? value : "#000000"
  const rgb = hexToRgb(safeValue) ?? { b: 0, g: 0, r: 0 }

  const handleToggle = () => {
    if (disabled) return

    if (!isOpen && controlRef.current) {
      const rect = controlRef.current.getBoundingClientRect()
      setPopoverPosition({ left: rect.left, top: rect.bottom + popoverGap })
    }

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
        popoverPosition &&
        createPortal(
          <ColorPickerPopover ref={popoverRef} style={{ left: popoverPosition.left, top: popoverPosition.top }}>
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
