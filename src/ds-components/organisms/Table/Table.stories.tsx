import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tag } from "@/ds-components/atoms"

import { Table } from "./Table"

type Aluno = {
  email: string
  id: number
  nome: string
  status: "ativo" | "inativo"
  turma: string
}

const alunos: Aluno[] = [
  { email: "ana.souza@escola.com", id: 1, nome: "Ana Beatriz Souza", status: "ativo", turma: "9º A" },
  { email: "carlos.lima@escola.com", id: 2, nome: "Carlos Eduardo Lima", status: "ativo", turma: "8º B" },
  { email: "fernanda.costa@escola.com", id: 3, nome: "Fernanda Alves Costa", status: "inativo", turma: "9º A" },
  { email: "gabriel.silva@escola.com", id: 4, nome: "Gabriel Henrique Silva", status: "ativo", turma: "7º C" },
  { email: "juliana.rocha@escola.com", id: 5, nome: "Juliana Pereira Rocha", status: "ativo", turma: "8º B" },
  { email: "lucas.martins@escola.com", id: 6, nome: "Lucas Martins Dias", status: "inativo", turma: "7º C" },
  { email: "mariana.ferreira@escola.com", id: 7, nome: "Mariana Ferreira Nunes", status: "ativo", turma: "9º A" },
  { email: "rafael.oliveira@escola.com", id: 8, nome: "Rafael Oliveira Santos", status: "ativo", turma: "8º B" },
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
    paginator: {
      control: "boolean",
      description: "Shows a footer with page navigation, splitting value into pages of rows items.",
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
    <Table dataKey="id" value={alunos}>
      <Table.Column field="nome" header="Nome" />
      <Table.Column field="email" header="E-mail" />
      <Table.Column field="turma" header="Turma" />
    </Table>
  ),
}

// The sortable prop on individual columns, letting the header be clicked to cycle asc -> desc -> unsorted
export const Sortable: Story = {
  render: () => (
    <Table dataKey="id" value={alunos}>
      <Table.Column field="nome" header="Nome" sortable />
      <Table.Column field="turma" header="Turma" sortable />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}

// A column's body renderer used to render a custom cell instead of the raw field value - here a status Tag
export const CustomCellRenderer: Story = {
  render: () => (
    <Table dataKey="id" value={alunos}>
      <Table.Column field="nome" header="Nome" sortable />
      <Table.Column field="turma" header="Turma" />
      <Table.Column
        body={(aluno) => (
          <Tag color={aluno.status === "ativo" ? "success" : "muted"} fontSize="xs" variant="soft">
            {aluno.status === "ativo" ? "Ativo" : "Inativo"}
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
    <Table dataKey="id" value={alunos}>
      <Table.Column field="nome" header="Nome" />
      <Table.Column
        align="right"
        body={(aluno) => `#${aluno.id.toString().padStart(4, "0")}`}
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
    <Table {...args} dataKey="id" value={alunos}>
      <Table.Column field="nome" header="Nome" sortable />
      <Table.Column field="turma" header="Turma" />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}

// The loading prop showing a loading row in place of the data, e.g. while a request is in flight
export const Loading: Story = {
  render: () => (
    <Table dataKey="id" loading value={alunos}>
      <Table.Column field="nome" header="Nome" />
      <Table.Column field="turma" header="Turma" />
    </Table>
  ),
}

// An empty value array falling back to the default (or a custom) emptyMessage
export const Empty: Story = {
  render: () => (
    <Table dataKey="id" emptyMessage="Nenhum aluno matriculado nesta turma." value={[]}>
      <Table.Column field="nome" header="Nome" />
      <Table.Column field="turma" header="Turma" />
    </Table>
  ),
}

// The striped prop set to false, rendering every row with the same background
export const NotStriped: Story = {
  render: () => (
    <Table dataKey="id" striped={false} value={alunos}>
      <Table.Column field="nome" header="Nome" />
      <Table.Column field="turma" header="Turma" />
      <Table.Column field="email" header="E-mail" />
    </Table>
  ),
}
