import type { CSSProperties } from "react"
import { forwardRef, useId } from "react"
import type { DropdownIndicatorProps, SelectInstance } from "react-select"
import ReactSelect, { components } from "react-select"

import { Icon, Text } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"

import { getSelectStyles, SelectWrapper } from "./Select.styles"

export type SelectOption = {
  label: string
  value: string
}

type SelectOwnProps = {
  options: SelectOption[]
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  defaultValue?: SelectOption | null
  elevated?: boolean
  helperText?: string
  id?: string
  isDisabled?: boolean
  name?: string
  placeholder?: string
  style?: CSSProperties
  title?: string
  value?: SelectOption | null
  onBlur?: () => void
  onChange?: (option: SelectOption | null) => void
}

export type SelectProps = SelectOwnProps

const DropdownIndicator = (props: DropdownIndicatorProps<SelectOption, false>) => (
  <components.DropdownIndicator {...props}>
    <Icon color="secondary" name="chevron-down" size={16} />
  </components.DropdownIndicator>
)

export const Select = forwardRef<SelectInstance<SelectOption, false>, SelectProps>((props, ref) => {
  const {
    borderRadius = "medium",
    className,
    defaultValue,
    elevated = true,
    helperText,
    id,
    isDisabled,
    name,
    onBlur,
    onChange,
    options,
    placeholder,
    style,
    title,
    value,
  } = props

  const generatedId = useId()

  const selectId = id ?? generatedId
  const selectStyles = getSelectStyles<SelectOption>({ borderRadius: borderRadiusLevels[borderRadius], elevated })

  return (
    <SelectWrapper className={className} style={style}>
      {title && (
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={selectId}>
          {title}
        </Text>
      )}
      <ReactSelect
        classNamePrefix="select"
        components={{ DropdownIndicator }}
        defaultValue={defaultValue}
        inputId={selectId}
        isDisabled={isDisabled}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        ref={ref}
        styles={selectStyles}
        value={value}
      />
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </SelectWrapper>
  )
})

Select.displayName = "Select"
