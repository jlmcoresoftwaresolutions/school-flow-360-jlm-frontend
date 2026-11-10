import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tag } from "@/ds-components/atoms"

import { Table } from "./Table"

type Student = {
  email: string
  id: number
  name: string
  schoolClass: string
  status: "active" | "inactive"
}

const students: Student[] = [
  { email: "ana.souza@escola.com", id: 1, name: "Ana Beatriz Souza", schoolClass: "9º A", status: "active" },
  { email: "carlos.lima@escola.com", id: 2, name: "Carlos Eduardo Lima", schoolClass: "8º B", status: "active" },
  { email: "fernanda.costa@escola.com", id: 3, name: "Fernanda Alves Costa", schoolClass: "9º A", status: "inactive" },
  { email: "gabriel.silva@escola.com", id: 4, name: "Gabriel Henrique Silva", schoolClass: "7º C", status: "active" },
  { email: "juliana.rocha@escola.com", id: 5, name: "Juliana Pereira Rocha", schoolClass: "8º B", status: "active" },
  { email: "lucas.martins@escola.com", id: 6, name: "Lucas Martins Dias", schoolClass: "7º C", status: "inactive" },
  {
    email: "mariana.ferreira@escola.com",
    id: 7,
    name: "Mariana Ferreira Nunes",
    schoolClass: "9º A",
    status: "active",
  },
  { email: "rafael.oliveira@escola.com", id: 8, name: "Rafael Oliveira Santos", schoolClass: "8º B", status: "active" },
]

const meta: Meta<typeof Table> = {
  argTypes: {
    emptyMessage: {
      control: "text",
      description: "Message shown in place of the rows when value is empty. Defaults to a pt-BR message.",
    },
    loading: {
      control: "boolean",
      description: "Shows a loading row instead of the data rows.",
    },
    loadingMessage: {
      control: "text",
      description: "Message shown in the loading row. Defaults to a pt-BR message.",
    },
    nextPageLabel: {
      control: "text",
      description: "Accessible name of the paginator's next button. Defaults to a pt-BR label.",
    },
    pageLabel: {
      control: false,
      description: "Builds the accessible name of each page button from its number. Defaults to a pt-BR label.",
    },
    pageSummary: {
      control: false,
      description: "Builds the footer's page summary from the current page and the total. Defaults to a pt-BR summary.",
    },
    paginator: {
      control: "boolean",
      description:
        "Shows a footer with numbered page navigation (see Pagination), splitting value into pages of rows items.",
    },
    previousPageLabel: {
      control: "text",
      description: "Accessible name of the paginator's previous button. Defaults to a pt-BR label.",
    },
    rows: {
      control: "number",
      description: "Number of rows per page when paginator is enabled. Defaults to 10.",
    },
    striped: {
      control: "boolean",
      description: "Alternates the background of even rows. Defaults to true.",
    },
  },
  component: Table,
  tags: ["autodocs"],
  title: "Organisms/Table",
}

export default meta

type Story = StoryObj<typeof Table>

// Default rendering with three simple columns and no sorting or pagination
export const Default: Story = {
  render: () => (
    <Table dataKey="id" value={students}>
      <Table.Column field="name" header="Nome" />
      <Table.Column field="email" header="E-mail" />
      <Table.Column field="schoolClass" header="Turma" />
    </Table>
  ),
}

// The sortable prop on individual columns, letting the header be clicked to cycle asc -> desc -> unsorted
export const Sortable: Story = {
  render: () => (
    <Table dataKey="id" value={students}>
      <Table.Column field="name" header="Nome" sortable />
      <Table.Column field="schoolClass" header="Turma" sortable />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}

// A column's body renderer used to render a custom cell instead of the raw field value - here a status Tag
export const CustomCellRenderer: Story = {
  render: () => (
    <Table dataKey="id" value={students}>
      <Table.Column field="name" header="Nome" sortable />
      <Table.Column field="schoolClass" header="Turma" />
      <Table.Column
        body={(student) => (
          <Tag color={student.status === "active" ? "success" : "muted"} fontSize="xs" variant="soft">
            {student.status === "active" ? "Ativo" : "Inativo"}
          </Tag>
        )}
        field="status"
        header="Status"
      />
    </Table>
  ),
}

// A column's align prop, here right-aligning a numeric-looking column via its body renderer
export const ColumnAlignment: Story = {
  render: () => (
    <Table dataKey="id" value={students}>
      <Table.Column field="name" header="Nome" />
      <Table.Column
        align="right"
        body={(student) => `#${student.id.toString().padStart(4, "0")}`}
        field="id"
        header="Matrícula"
      />
    </Table>
  ),
}

// The paginator and rows props splitting a larger data set into pages, navigated via the footer buttons
export const Paginator: Story = {
  args: { paginator: true, rows: 3 },
  render: (args) => (
    <Table {...args} dataKey="id" value={students}>
      <Table.Column field="name" header="Nome" sortable />
      <Table.Column field="schoolClass" header="Turma" />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}

// The loading prop showing a loading row in place of the data, e.g. while a request is in flight
export const Loading: Story = {
  render: () => (
    <Table dataKey="id" loading value={students}>
      <Table.Column field="name" header="Nome" />
      <Table.Column field="schoolClass" header="Turma" />
    </Table>
  ),
}

// An empty value array falling back to the default (or a custom) emptyMessage
export const Empty: Story = {
  render: () => (
    <Table dataKey="id" emptyMessage="Nenhum aluno matriculado nesta turma." value={[]}>
      <Table.Column field="name" header="Nome" />
      <Table.Column field="schoolClass" header="Turma" />
    </Table>
  ),
}

// The striped prop set to false, rendering every row with the same background
export const NotStriped: Story = {
  render: () => (
    <Table dataKey="id" striped={false} value={students}>
      <Table.Column field="name" header="Nome" />
      <Table.Column field="schoolClass" header="Turma" />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}

// The loadingMessage and paginator label props replacing the default copy, as a translated page would
export const CustomLabels: Story = {
  render: () => (
    <Table
      nextPageLabel="Avançar"
      pageLabel={(page) => `Ir para a página ${page}`}
      pageSummary={(page, totalPages) => `${page} / ${totalPages}`}
      paginator
      previousPageLabel="Voltar"
      rows={3}
      value={students}
    >
      <Table.Column field="name" header="Nome" />
      <Table.Column field="schoolClass" header="Turma" />
    </Table>
  ),
}
