import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Badge, Button } from "../../atoms"
import { Select, type SelectOption } from "../../molecules"
import { Table } from "../Table"
import { FilterBar, type FilterBarProps } from "./FilterBar"

type Unidade = {
  cidade: string
  id: string
  nome: string
  status: "Ativa" | "Inativa"
}

const unidades: Unidade[] = [
  { cidade: "Belo Horizonte", id: "1", nome: "Unidade Centro", status: "Ativa" },
  { cidade: "Contagem", id: "2", nome: "Unidade Norte", status: "Ativa" },
  { cidade: "Betim", id: "3", nome: "Unidade Oeste", status: "Inativa" },
  { cidade: "Belo Horizonte", id: "4", nome: "Unidade Pampulha", status: "Ativa" },
]

const statusOptions: SelectOption[] = [
  { label: "Ativa", value: "Ativa" },
  { label: "Inativa", value: "Inativa" },
]

const cidadeOptions: SelectOption[] = [
  { label: "Belo Horizonte", value: "Belo Horizonte" },
  { label: "Betim", value: "Betim" },
  { label: "Contagem", value: "Contagem" },
]

// The FilterBar only reports what the user picked; this wrapper owns that state and applies it to a
// table, the way a listing page would.
const FilteredListing = (props: Partial<FilterBarProps>) => {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<SelectOption | null>(null)
  const [cidade, setCidade] = useState<SelectOption | null>(null)

  const hasFilters = search !== "" || status !== null || cidade !== null
  const filtered = unidades.filter(
    (unidade) =>
      unidade.nome.toLowerCase().includes(search.toLowerCase()) &&
      (!status || unidade.status === status.value) &&
      (!cidade || unidade.cidade === cidade.value),
  )

  const clear = () => {
    setSearch("")
    setStatus(null)
    setCidade(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <FilterBar
        actions={<Button>Nova unidade</Button>}
        clearDisabled={!hasFilters}
        clearLabel="Limpar filtros"
        label="Filtrar unidades"
        onClear={clear}
        onSearchChange={setSearch}
        searchLabel="Buscar unidade"
        searchPlaceholder="Buscar por nome..."
        searchValue={search}
        {...props}
      >
        <Select onChange={setStatus} options={statusOptions} placeholder="Todos" title="Status" value={status} />
        <Select onChange={setCidade} options={cidadeOptions} placeholder="Todas" title="Cidade" value={cidade} />
      </FilterBar>

      <Table dataKey="id" emptyMessage="Nenhuma unidade encontrada para os filtros escolhidos." value={filtered}>
        <Table.Column field="nome" header="Unidade" />
        <Table.Column field="cidade" header="Cidade" />
        <Table.Column
          body={(row: Unidade) => <Badge tone={row.status === "Ativa" ? "success" : "neutral"}>{row.status}</Badge>}
          field="status"
          header="Status"
        />
      </Table>
    </div>
  )
}

const meta: Meta<typeof FilterBar> = {
  argTypes: {
    actions: {
      control: false,
      description: "Content of the trailing side, typically the listing's primary action.",
    },
    children: {
      control: false,
      description: "The filter controls (e.g. Selects). Each one gets an evenly shared, wrapping slot.",
    },
    clearDisabled: {
      control: "boolean",
      description: "Disables the clear button, e.g. while no filter is applied.",
    },
    clearLabel: {
      control: "text",
      description: "Text of the clear button. The button only shows when both this and onClear are given.",
    },
    label: {
      control: "text",
      description: "Accessible name of the search landmark.",
    },
    onClear: {
      control: false,
      description: "Called when the clear button is clicked. The page resets its own filter state.",
    },
    onSearchChange: {
      control: false,
      description: "Called with the search text on every change. The search field only shows when this is given.",
    },
    searchLabel: {
      control: "text",
      description: "Accessible name of the search field, which has no visible label.",
    },
    searchPlaceholder: {
      control: "text",
      description: "Placeholder of the search field.",
    },
    searchValue: {
      control: "text",
      description: "Current search text. The search field is controlled.",
    },
  },
  component: FilterBar,
  parameters: { layout: "padded" },
  render: (args) => <FilteredListing {...args} />,
  tags: ["autodocs"],
  title: "Organisms/FilterBar",
}

export default meta

type Story = StoryObj<typeof FilterBar>

// Default rendering: search, two labelled filters, clear and a primary action, filtering a table below
export const Default: Story = {}

// Only the search field, with no filters, clear button or actions
export const SearchOnly: Story = {
  render: () => {
    const SearchOnlyDemo = () => {
      const [search, setSearch] = useState("")

      return (
        <FilterBar
          label="Buscar alunos"
          onSearchChange={setSearch}
          searchLabel="Buscar aluno"
          searchPlaceholder="Nome ou matrícula..."
          searchValue={search}
        />
      )
    }

    return <SearchOnlyDemo />
  },
}
