import type { Meta, StoryObj } from "@storybook/react-vite"

import { FileUpload } from "./FileUpload"

const meta: Meta<typeof FileUpload> = {
  argTypes: {
    accept: { control: "text", description: "Native accept attribute, restricting selectable file types" },
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the file input" },
    error: {
      control: "text",
      description:
        "Error message shown below the drop zone in red, replacing helperText. Also turns the dashed border red and sets aria-invalid.",
    },
    helperText: { control: "text", description: "Text rendered below the drop zone to provide extra context" },
    multiple: { control: "boolean", description: "Native multiple attribute, allowing more than one file" },
    placeholder: {
      control: "text",
      description: "Text shown in the drop zone before a file is picked. Defaults to a pt-BR prompt.",
    },
    required: {
      control: "boolean",
      description: "Native required attribute, forwarded to the file input. Also adds a red asterisk to the title.",
    },
    title: { control: "text", description: "Label rendered above the drop zone" },
  },
  component: FileUpload,
  tags: ["autodocs"],
  title: "Molecules/FileUpload",
}

export default meta

type Story = StoryObj<typeof FileUpload>

// Default rendering with no visible title, named through aria-label instead
export const Default: Story = {
  args: { "aria-label": "Anexo" },
}

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

// The error prop replacing helperText with a red message and turning the dashed border red
export const WithError: Story = {
  args: {
    error: "O arquivo deve ter no máximo 2 MB.",
    helperText: "PNG ou SVG, fundo transparente recomendado.",
    title: "Logo",
  },
}

// The placeholder prop replacing the default prompt shown before a file is picked
export const CustomPlaceholder: Story = {
  args: {
    placeholder: "Arraste o logo aqui ou clique para escolher",
    title: "Logo",
  },
}
