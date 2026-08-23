import type { Meta, StoryObj } from "@storybook/react-vite"

import { FileUpload } from "./FileUpload"

const meta: Meta<typeof FileUpload> = {
  argTypes: {
    accept: { control: "text", description: "Native accept attribute, restricting selectable file types" },
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the file input" },
    helperText: { control: "text", description: "Text rendered below the drop zone to provide extra context" },
    multiple: { control: "boolean", description: "Native multiple attribute, allowing more than one file" },
    title: { control: "text", description: "Label rendered above the drop zone" },
  },
  component: FileUpload,
  tags: ["autodocs"],
  title: "Molecules/FileUpload",
}

export default meta

type Story = StoryObj<typeof FileUpload>

// Default rendering with no title or helperText set
export const Default: Story = {}

// The title prop rendering a label above the drop zone, linked via htmlFor/id
export const WithTitle: Story = {
  args: { title: "Comprovante de residência" },
}

// The helperText prop rendering supporting text below the drop zone
export const WithHelperText: Story = {
  args: { helperText: "Formatos aceitos: PDF, JPG ou PNG.", title: "Comprovante de residência" },
}

// The accept prop restricting the file picker to specific types
export const AcceptPdfOnly: Story = {
  args: { accept: "application/pdf", helperText: "Apenas arquivos PDF.", title: "Contrato assinado" },
}

// The multiple prop allowing more than one file to be selected at once
export const Multiple: Story = {
  args: { multiple: true, title: "Documentos da matrícula" },
}

// The native disabled attribute, forwarded straight through to the file input
export const Disabled: Story = {
  args: { disabled: true, title: "Comprovante de residência" },
}
