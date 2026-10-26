import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Pagination, type PaginationProps } from "./Pagination"

// Pagination is controlled, so every story wraps it in a component that owns the current page.
const PaginationDemo = (props: PaginationProps) => {
  const [page, setPage] = useState(props.page)

  return <Pagination {...props} onChange={setPage} page={page} />
}

const meta: Meta<typeof Pagination> = {
  args: {
    label: "Paginação",
    nextLabel: "Próxima página",
    page: 1,
    pageLabel: (page) => `Página ${page}`,
    previousLabel: "Página anterior",
    totalPages: 5,
  },
  argTypes: {
    label: {
      control: "text",
      description: "Accessible name of the navigation landmark.",
    },
    nextLabel: {
      control: "text",
      description: "Accessible name of the icon-only next button.",
    },
    onChange: {
      control: false,
      description: "Called with the 1-based page the user picked. The component is controlled.",
    },
    page: {
      control: "number",
      description: "The current page, 1-based. Clamped to the 1..totalPages range.",
    },
    pageLabel: {
      control: false,
      description: "Builds the accessible name of each page button from its number. Without it, the number itself.",
    },
    previousLabel: {
      control: "text",
      description: "Accessible name of the icon-only previous button.",
    },
    siblingCount: {
      control: "number",
      description:
        "How many pages to show on each side of the current one before collapsing into an ellipsis. Defaults to 1.",
    },
    totalPages: {
      control: "number",
      description: "Total number of pages. Zero is treated as one.",
    },
  },
  component: Pagination,
  parameters: { layout: "centered" },
  render: (args) => <PaginationDemo {...args} />,
  tags: ["autodocs"],
  title: "Molecules/Pagination",
}

export default meta

type Story = StoryObj<typeof Pagination>

// Default rendering: few enough pages that every one of them is shown
export const Default: Story = {}

// Many pages, collapsed into ellipses around the current page
export const ManyPages: Story = {
  args: {
    page: 6,
    totalPages: 20,
  },
}

// The siblingCount prop showing two neighbours on each side of the current page
export const MoreSiblings: Story = {
  args: {
    page: 10,
    siblingCount: 2,
    totalPages: 20,
  },
}

// A single page, where both previous and next are disabled
export const SinglePage: Story = {
  args: {
    totalPages: 1,
  },
}
