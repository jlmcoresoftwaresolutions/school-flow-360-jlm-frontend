import type { CSSProperties } from "react"
import { createContext, forwardRef, useContext, useId, useState } from "react"
import type { DropdownIndicatorProps, InputProps, SelectInstance } from "react-select"
import ReactSelect, { components } from "react-select"

import { FieldLabel, FieldMessage, Icon } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType, motion, opacity } from "@/foundation"
import { joinIds } from "@/utils/strings"

import { getSelectStyles, SelectWrapper } from "./Select.styles"

// react-select takes no aria-describedby prop (it sets its own on the input), so the id of the
// message under the field reaches the custom Input below through this context instead.
const SelectMessageContext = createContext<string | undefined>(undefined)

export type SelectOption = {
  label: string
  value: string
}

type SelectOwnProps = {
  options: SelectOption[]
  "aria-label"?: string
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  defaultValue?: SelectOption | null
  elevated?: boolean
  error?: string
  helperText?: string
  id?: string
  isDisabled?: boolean
  name?: string
  placeholder?: string
  required?: boolean
  style?: CSSProperties
  title?: string
  value?: SelectOption | null
  onBlur?: () => void
  onChange?: (option: SelectOption | null) => void
}

export type SelectProps = SelectOwnProps

const DropdownIndicator = (props: DropdownIndicatorProps<SelectOption, false>) => (
  <components.DropdownIndicator {...props}>
    <Icon
      color="secondary"
      name="chevron-down"
      size={16}
      style={{
        transform: props.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: `transform ${motion.duration.fast} ${motion.easing.ease}`,
      }}
    />
  </components.DropdownIndicator>
)

// Adds the message under the field to the input's own description (react-select's aria-describedby
// points at its placeholder), and announces required, which react-select only enforces natively.
const Input = (props: InputProps<SelectOption, false>) => {
  const { selectProps } = props

  const messageId = useContext(SelectMessageContext)

  return (
    <components.Input
      {...props}
      aria-describedby={joinIds(props["aria-describedby"], messageId)}
      aria-required={selectProps.required || undefined}
    />
  )
}

export const Select = forwardRef<SelectInstance<SelectOption, false>, SelectProps>((props, ref) => {
  const {
    "aria-label": ariaLabel,
    borderRadius = "low",
    className,
    defaultValue,
    elevated = true,
    error,
    helperText,
    id,
    isDisabled,
    name,
    onBlur,
    onChange,
    options,
    placeholder,
    required,
    style,
    title,
    value,
  } = props

  const generatedId = useId()

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const selectId = id ?? generatedId
  const messageId = `${selectId}-message`
  const selectStyles = getSelectStyles<SelectOption>({
    borderRadius: borderRadiusLevels[borderRadius],
    elevated,
    hasError: Boolean(error),
  })

  return (
    <SelectWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={selectId} required={required}>
          {title}
        </FieldLabel>
      )}
      <SelectMessageContext.Provider value={error || helperText ? messageId : undefined}>
        <ReactSelect
          aria-errormessage={error ? messageId : undefined}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          classNamePrefix="select"
          components={{ DropdownIndicator, Input }}
          defaultValue={defaultValue}
          inputId={selectId}
          isDisabled={isDisabled}
          name={name}
          onBlur={onBlur}
          onChange={onChange}
          onMenuClose={() => setIsMenuOpen(false)}
          onMenuOpen={() => setIsMenuOpen(true)}
          options={options}
          placeholder={placeholder}
          ref={ref}
          required={required}
          styles={selectStyles}
          value={value}
        />
      </SelectMessageContext.Provider>
      <FieldMessage
        error={error}
        helperText={helperText}
        id={messageId}
        style={{
          opacity: isMenuOpen ? opacity.hidden : opacity.visible,
          transition: `opacity ${motion.duration.fast} ${motion.easing.ease}`,
        }}
      />
    </SelectWrapper>
  )
})

Select.displayName = "Select"
