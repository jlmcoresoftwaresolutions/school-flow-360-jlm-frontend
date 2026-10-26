import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { colors } from "@/foundation"

import { Tabs, type TabsItem } from "./Tabs"

const items: TabsItem[] = [
  { content: <p>Painel A</p>, key: "a", label: "Aba A" },
  { content: <p>Painel B</p>, key: "b", label: "Aba B" },
  { content: <p>Painel C</p>, key: "c", label: "Aba C" },
]

const renderTabs = (overrides: Partial<Parameters<typeof Tabs>[0]> = {}) => {
  const onChange = vi.fn()

  render(<Tabs items={items} label="Seções" onChange={onChange} value="a" {...overrides} />)

  return { onChange }
}

describe("Tabs", () => {
  it("renders a tab list named by label with one tab per item", () => {
    renderTabs()

    expect(screen.getByRole("tablist", { name: "Seções" })).toBeInTheDocument()
    expect(screen.getAllByRole("tab")).toHaveLength(3)
  })

  it("marks only the tab matching value as selected", () => {
    renderTabs({ value: "b" })

    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("aria-selected", "true")
  })

  it("highlights the selected tab", () => {
    renderTabs()

    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveStyle({ color: colors.info[700] })
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveStyle({ color: colors.neutral[600] })
  })

  it("renders only the selected tab's panel, labelled by that tab", () => {
    renderTabs({ value: "b" })

    const panel = screen.getByRole("tabpanel")

    expect(panel).toHaveTextContent("Painel B")
    expect(screen.queryByText("Painel A")).not.toBeInTheDocument()
    expect(panel).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "Aba B" }).id)
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("aria-controls", panel.id)
  })

  it("renders no panel, and no aria-controls, for tabs without content", () => {
    renderTabs({ items: items.map((item) => ({ key: item.key, label: item.label })) })

    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Aba A" })).not.toHaveAttribute("aria-controls")
  })

  it("calls onChange with the key of the clicked tab", () => {
    const { onChange } = renderTabs()

    fireEvent.click(screen.getByRole("tab", { name: "Aba C" }))

    expect(onChange).toHaveBeenCalledWith("c")
  })

  it("keeps only the selected tab in the Tab order", () => {
    renderTabs({ value: "b" })

    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveAttribute("tabindex", "-1")
    expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("tabindex", "0")
  })

  it("gives the first enabled tab the Tab stop when value matches nothing", () => {
    renderTabs({ items: [{ disabled: true, key: "x", label: "Aba X" }, ...items], value: "nenhum" })

    expect(screen.getByRole("tab", { name: "Aba X" })).toHaveAttribute("tabindex", "-1")
    expect(screen.getByRole("tab", { name: "Aba A" })).toHaveAttribute("tabindex", "0")
  })

  it("does not call onChange for a disabled tab", () => {
    const { onChange } = renderTabs({ items: [...items, { disabled: true, key: "d", label: "Aba D" }] })

    fireEvent.click(screen.getByRole("tab", { name: "Aba D" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  describe("keyboard", () => {
    const Controlled = ({ list = items }: { list?: TabsItem[] }) => {
      const [value, setValue] = useState("a")

      return <Tabs items={list} onChange={setValue} value={value} />
    }

    it("moves to the next tab with ArrowRight, selecting and focusing it", () => {
      render(<Controlled />)

      const first = screen.getByRole("tab", { name: "Aba A" })
      first.focus()
      fireEvent.keyDown(first, { key: "ArrowRight" })

      expect(screen.getByRole("tab", { name: "Aba B" })).toHaveFocus()
      expect(screen.getByRole("tab", { name: "Aba B" })).toHaveAttribute("aria-selected", "true")
    })

    it("wraps from the last tab to the first with ArrowRight, and back with ArrowLeft", () => {
      render(<Controlled />)

      const first = screen.getByRole("tab", { name: "Aba A" })
      first.focus()
      fireEvent.keyDown(first, { key: "ArrowLeft" })

      expect(screen.getByRole("tab", { name: "Aba C" })).toHaveFocus()

      fireEvent.keyDown(screen.getByRole("tab", { name: "Aba C" }), { key: "ArrowRight" })

      expect(screen.getByRole("tab", { name: "Aba A" })).toHaveFocus()
    })

    it("jumps to the first and last tabs with Home and End", () => {
      render(<Controlled />)

      const first = screen.getByRole("tab", { name: "Aba A" })
      first.focus()
      fireEvent.keyDown(first, { key: "End" })

      expect(screen.getByRole("tab", { name: "Aba C" })).toHaveFocus()

      fireEvent.keyDown(screen.getByRole("tab", { name: "Aba C" }), { key: "Home" })

      expect(screen.getByRole("tab", { name: "Aba A" })).toHaveFocus()
    })

    it("skips disabled tabs", () => {
      render(<Controlled list={[items[0], { disabled: true, key: "b", label: "Aba B" }, items[2]]} />)

      const first = screen.getByRole("tab", { name: "Aba A" })
      first.focus()
      fireEvent.keyDown(first, { key: "ArrowRight" })

      expect(screen.getByRole("tab", { name: "Aba C" })).toHaveFocus()
    })

    it("ignores other keys", () => {
      render(<Controlled />)

      const first = screen.getByRole("tab", { name: "Aba A" })
      first.focus()
      fireEvent.keyDown(first, { key: "a" })

      expect(first).toHaveFocus()
      expect(first).toHaveAttribute("aria-selected", "true")
    })
  })

  it("forwards className and style to the root element", () => {
    const { container } = render(
      <Tabs className="custom" items={items} onChange={vi.fn()} style={{ margin: "4px" }} value="a" />,
    )

    expect(container.firstElementChild).toHaveClass("custom")
    expect(container.firstElementChild).toHaveStyle({ margin: "4px" })
  })
})
