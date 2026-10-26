import type { ChangeEvent, ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId, useState } from "react"

import { FieldLabel, FieldMessage, Icon, Text } from "@/ds-components/atoms"
import { joinIds } from "@/utils/strings"

import { DropZone, FileUploadWrapper, HiddenFileInput } from "./FileUpload.styles"

type FileUploadOwnProps = {
  className?: string
  error?: string
  helperText?: string
  placeholder?: string
  style?: CSSProperties
  title?: string
}

export type FileUploadProps = FileUploadOwnProps &
  Omit<ComponentPropsWithoutRef<"input">, keyof FileUploadOwnProps | "type">

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>((props, ref) => {
  const {
    "aria-describedby": ariaDescribedBy,
    className,
    error,
    helperText,
    id,
    onChange,
    placeholder = "Clique para selecionar um arquivo",
    required,
    style,
    title,
    ...rest
  } = props

  const generatedId = useId()

  const [fileNames, setFileNames] = useState<string[]>([])

  const fileUploadId = id ?? generatedId
  const messageId = `${fileUploadId}-message`
  const describedBy = joinIds(ariaDescribedBy, (error || helperText) && messageId)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))
    onChange?.(event)
  }

  return (
    <FileUploadWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={fileUploadId} required={required}>
          {title}
        </FieldLabel>
      )}
      <DropZone $hasError={Boolean(error)}>
        <Icon color="secondary" name="file-outline" size={24} />
        <Text aria-hidden="true" as="span" color="secondary" fontSize="sm">
          {fileNames.length > 0 ? fileNames.join(", ") : placeholder}
        </Text>
        <HiddenFileInput
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          id={fileUploadId}
          onChange={handleChange}
          ref={ref}
          required={required}
          type="file"
          {...rest}
        />
      </DropZone>
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </FileUploadWrapper>
  )
})

FileUpload.displayName = "FileUpload"
