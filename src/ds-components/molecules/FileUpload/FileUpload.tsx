import type { ChangeEvent, ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId, useState } from "react"

import { Icon, Text } from "@/ds-components/atoms"

import { DropZone, FileUploadWrapper, HiddenFileInput } from "./FileUpload.styles"

type FileUploadOwnProps = {
  className?: string
  helperText?: string
  style?: CSSProperties
  title?: string
}

export type FileUploadProps = FileUploadOwnProps &
  Omit<ComponentPropsWithoutRef<"input">, keyof FileUploadOwnProps | "type">

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>((props, ref) => {
  const { className, helperText, id, onChange, style, title, ...rest } = props

  const generatedId = useId()

  const [fileNames, setFileNames] = useState<string[]>([])

  const fileUploadId = id ?? generatedId

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))
    onChange?.(event)
  }

  return (
    <FileUploadWrapper className={className} style={style}>
      {title && (
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={fileUploadId}>
          {title}
        </Text>
      )}
      <DropZone htmlFor={fileUploadId}>
        <Icon color="secondary" name="file-outline" size={24} />
        <Text as="span" color="secondary" fontSize="sm">
          {fileNames.length > 0 ? fileNames.join(", ") : "Clique para selecionar um arquivo"}
        </Text>
        <HiddenFileInput id={fileUploadId} onChange={handleChange} ref={ref} type="file" {...rest} />
      </DropZone>
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </FileUploadWrapper>
  )
})

FileUpload.displayName = "FileUpload"
