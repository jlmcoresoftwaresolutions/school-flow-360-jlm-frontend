import { ptBR } from "date-fns/locale"
import type { CSSProperties, MouseEvent, Ref } from "react"
import { forwardRef, useId, useState } from "react"
import ReactDatePicker, { registerLocale } from "react-datepicker"

import { Icon, Text } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType, motion, opacity } from "@/foundation"

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
  dateFormat?: string
  defaultValue?: Date | null
  disabled?: boolean
  elevated?: boolean
  helperText?: string
  id?: string
  maxDate?: Date
  minDate?: Date
  name?: string
  placeholder?: string
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
    dateFormat = "dd/MM/yyyy",
    defaultValue = null,
    disabled,
    elevated = true,
    helperText,
    id,
    maxDate,
    minDate,
    name,
    onBlur,
    onChange,
    placeholder,
    style,
    title,
    value,
  } = props

  const generatedId = useId()

  const [uncontrolledValue, setUncontrolledValue] = useState<Date | null>(defaultValue)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const dateInputId = id ?? generatedId
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
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={dateInputId}>
          {title}
        </Text>
      )}
      <StyledCalendar $borderRadius={borderRadiusLevels[borderRadius]}>
        <DatePickerWrapper>
          <ReactDatePicker
            customInput={
              <DateInputField $borderRadius={borderRadiusLevels[borderRadius]} $elevated={elevated} ref={ref} />
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
            selected={selectedValue}
            showPopperArrow={false}
          />
          <InputIconsWrapper>
            {selectedValue && !disabled && (
              <ClearButton
                aria-label="Limpar data selecionada"
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
      {helperText && (
        <Text
          as="span"
          color="muted"
          fontSize="xs"
          style={{
            opacity: isCalendarOpen ? opacity.hidden : opacity.visible,
            transition: `opacity ${motion.duration.fast} ${motion.easing.ease}`,
          }}
        >
          {helperText}
        </Text>
      )}
    </DateInputWrapper>
  )
})

DateInput.displayName = "DateInput"
