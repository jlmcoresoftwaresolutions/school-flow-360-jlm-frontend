import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { UseTooltipOptions } from "./useTooltip"
import { useTooltip } from "./useTooltip"

type HintedButtonProps = {
  options?: UseTooltipOptions
  tooltip?: string
  onFocus?: () => void
}

const HintedButton = (props: HintedButtonProps) => {
  const { onFocus, options, tooltip } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip, options)

  return (
    <>
      <button onFocus={onFocus} type="button" {...tooltipHandlers}>
        Salvar
      </button>
      {tooltipElement}
    </>
  )
}

describe("useTooltip", () => {
  it("shows the tooltip by its element on hover, and hides it on mouse leave", () => {
    render(<HintedButton tooltip="Salva as alterações" />)

    fireEvent.mouseEnter(screen.getByRole("button"))
    expect(screen.getByRole("tooltip")).toHaveTextContent("Salva as alterações")
    expect(screen.getByRole("tooltip")).toHaveStyle({ visibility: "visible" })

    fireEvent.mouseLeave(screen.getByRole("button"))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("also shows it on keyboard focus, and hides it on blur", () => {
    render(<HintedButton tooltip="Salva as alterações" />)

    fireEvent.focus(screen.getByRole("button"))
    expect(screen.getByRole("tooltip")).toBeInTheDocument()

    fireEvent.blur(screen.getByRole("button"))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("follows the cursor with anchor cursor, and only on hover", () => {
    render(<HintedButton options={{ anchor: "cursor" }} tooltip="Salva as alterações" />)

    fireEvent.focus(screen.getByRole("button"))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole("button"), { clientX: 10, clientY: 20 })
    expect(screen.getByRole("tooltip")).toHaveStyle({ left: "26px", top: "36px" })

    fireEvent.mouseMove(screen.getByRole("button"), { clientX: 50, clientY: 60 })
    expect(screen.getByRole("tooltip")).toHaveStyle({ left: "66px", top: "76px" })
  })

  it("never shows on a touch, whose emulated hover would never end", () => {
    render(<HintedButton tooltip="Salva as alterações" />)

    const button = screen.getByRole("button")
    fireEvent.touchStart(button)
    fireEvent.mouseEnter(button)
    fireEvent.focus(button)

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("shows again on a mouse hover a while after a touch", () => {
    vi.useFakeTimers()
    render(<HintedButton tooltip="Salva as alterações" />)

    const button = screen.getByRole("button")
    fireEvent.touchStart(button)
    vi.advanceTimersByTime(1500)
    fireEvent.mouseEnter(button)

    expect(screen.getByRole("tooltip")).toBeInTheDocument()
    vi.useRealTimers()
  })

  it("leaves the element's own handlers alone when there is no tooltip", () => {
    const onFocus = vi.fn()
    render(<HintedButton onFocus={onFocus} />)

    fireEvent.focus(screen.getByRole("button"))

    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })
})
