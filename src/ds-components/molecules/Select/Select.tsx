import type { ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId } from "react"

import { Icon, Text } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"

import { SelectChevron, SelectFieldWrapper, SelectWrapper, StyledSelect } from "./Select.styles"

export type SelectOption = {
  label: string
  value: string
}

type SelectOwnProps = {
  options: SelectOption[]
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  elevated?: boolean
  helperText?: string
  placeholder?: string
  style?: CSSProperties
  title?: string
}

export type SelectProps = SelectOwnProps & Omit<ComponentPropsWithoutRef<"select">, keyof SelectOwnProps>

export const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const {
    borderRadius = "medium",
    className,
    elevated = true,
    helperText,
    id,
    options,
    placeholder,
    style,
    title,
    ...rest
  } = props

  const generatedId = useId()

  const selectId = id ?? generatedId

  return (
    <SelectWrapper className={className} style={style}>
      {title && (
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={selectId}>
          {title}
        </Text>
      )}
      <SelectFieldWrapper>
        <StyledSelect
          $borderRadius={borderRadiusLevels[borderRadius]}
          $elevated={elevated}
          id={selectId}
          ref={ref}
          {...rest}
        >
          {placeholder && (
            <option disabled value="">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StyledSelect>
        <SelectChevron>
          <Icon color="secondary" name="chevron-down" size={16} />
        </SelectChevron>
      </SelectFieldWrapper>
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </SelectWrapper>
  )
})

Select.displayName = "Select"
