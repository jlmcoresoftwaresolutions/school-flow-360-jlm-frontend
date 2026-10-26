import { ptBR } from "date-fns/locale"
import type { CSSProperties, MouseEvent, Ref } from "react"
import { forwardRef, useId, useState } from "react"
import ReactDatePicker, { registerLocale } from "react-datepicker"

import { FieldLabel, FieldMessage, Icon } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType, motion, opacity } from "@/foundation"

import type { InputSize } from "../Input/Input.styles"
import { StyledInput } from "../Input/Input.styles"
import {
  CalendarIconWrapper,
  ClearButton,
  DateInputWrapper,
  DatePickerWrapper,
  InputIconsWrapper,
  StyledCalendar,
} from "./DateInput.styles"

registerLocale("pt-BR", ptBR)

type DateInputFieldProps = {
  $borderRadius: string
  $elevated: boolean
  $size: InputSize
  $hasError?: boolean
  innerRef?: Ref<HTMLInputElement>
}

// Reusing Input's own StyledInput keeps DateInput and Input visually identical by construction:
// the box model, border, shadow and focus ring all come from the same source rather than from a
// copy that could drift as Input changes. The wrapper exists only to merge two refs onto that one
// node — react-datepicker hands over its own ref through the prop named by customInputRef, and
// the ref forwarded by DateInput's caller has to reach the same input.
const DateInputField = forwardRef<HTMLInputElement, DateInputFieldProps>((props, ref) => {
  const { innerRef, ...rest } = props

  const setRefs = (node: HTMLInputElement | null) => {
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node

    if (typeof innerRef === "function") innerRef(node)
    else if (innerRef) innerRef.current = node
  }

  return <StyledInput {...rest} ref={setRefs} />
})

DateInputField.displayName = "DateInputField"

type DateInputOwnProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  clearLabel?: string
  dateFormat?: string
  defaultValue?: Date | null
  disabled?: boolean
  elevated?: boolean
  error?: string
  helperText?: string
  id?: string
  maxDate?: Date
  minDate?: Date
  name?: string
  placeholder?: string
  required?: boolean
  style?: CSSProperties
  title?: string
  value?: Date | null
  onBlur?: () => void
  onChange?: (date: Date | null) => void
}

export type DateInputProps = DateInputOwnProps

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>((props, ref) => {
  const {
    borderRadius = "low",
    className,
    clearLabel = "Limpar data selecionada",
    dateFormat = "dd/MM/yyyy",
    defaultValue = null,
    disabled,
    elevated = true,
    error,
    helperText,
    id,
    maxDate,
    minDate,
    name,
    onBlur,
    onChange,
    placeholder,
    required,
    style,
    title,
    value,
  } = props

  const generatedId = useId()

  const [uncontrolledValue, setUncontrolledValue] = useState<Date | null>(defaultValue)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const dateInputId = id ?? generatedId
  const messageId = `${dateInputId}-message`
  const isControlled = value !== undefined
  const selectedValue = isControlled ? value : uncontrolledValue

  // Unlike Input, which is a native input and so keeps its own value in the DOM, the picked date
  // only lives in React state. Without this fallback the field would never update unless the
  // caller wired both value and onChange, leaving a bare <DateInput /> unable to select anything.
  const handleChange = (date: Date | null) => {
    if (!isControlled) setUncontrolledValue(date)
    onChange?.(date)
  }

  // react-datepicker detects an outside click via a document-level "mousedown" listener, which
  // fires (and would close an already-open calendar) before this button's own "click" handler
  // ever runs — stopping propagation there is too late. Stopping it on mousedown instead keeps
  // that native event from ever reaching document.
  const handleClearMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleClear = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    handleChange(null)
  }

  return (
    <DateInputWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={dateInputId} required={required}>
          {title}
        </FieldLabel>
      )}
      <StyledCalendar $borderRadius={borderRadiusLevels[borderRadius]}>
        <DatePickerWrapper>
          <ReactDatePicker
            ariaDescribedBy={error || helperText ? messageId : undefined}
            ariaInvalid={error ? "true" : undefined}
            ariaRequired={required ? "true" : undefined}
            customInput={
              <DateInputField
                $borderRadius={borderRadiusLevels[borderRadius]}
                $elevated={elevated}
                $hasError={Boolean(error)}
                $size="medium"
                ref={ref}
              />
            }
            customInputRef="innerRef"
            dateFormat={dateFormat}
            disabled={disabled}
            id={dateInputId}
            locale="pt-BR"
            maxDate={maxDate}
            minDate={minDate}
            name={name}
            onBlur={onBlur}
            onCalendarClose={() => setIsCalendarOpen(false)}
            onCalendarOpen={() => setIsCalendarOpen(true)}
            onChange={handleChange}
            placeholderText={placeholder}
            popperPlacement="bottom-start"
            required={required}
            selected={selectedValue}
            showPopperArrow={false}
          />
          <InputIconsWrapper>
            {selectedValue && !disabled && (
              <ClearButton
                aria-label={clearLabel}
                onClick={handleClear}
                onMouseDown={handleClearMouseDown}
                type="button"
              >
                <Icon color="secondary" name="x" size={16} />
              </ClearButton>
            )}
            <CalendarIconWrapper>
              <Icon color="secondary" name="calendar-outline" size={20} />
            </CalendarIconWrapper>
          </InputIconsWrapper>
        </DatePickerWrapper>
      </StyledCalendar>
      <FieldMessage
        error={error}
        helperText={helperText}
        id={messageId}
        style={{
          opacity: isCalendarOpen ? opacity.hidden : opacity.visible,
          transition: `opacity ${motion.duration.fast} ${motion.easing.ease}`,
        }}
      />
    </DateInputWrapper>
  )
})

DateInput.displayName = "DateInput"
