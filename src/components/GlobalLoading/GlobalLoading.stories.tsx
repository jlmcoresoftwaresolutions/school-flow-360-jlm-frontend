import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/ds-components/atoms"
import { startLoading, stopLoading } from "@/utils/loadingStore"

import { GlobalLoading } from "./GlobalLoading"

const meta: Meta<typeof GlobalLoading> = {
  component: GlobalLoading,
  tags: ["autodocs"],
  title: "Components/GlobalLoading",
}

export default meta

type Story = StoryObj<typeof GlobalLoading>

// Toggled manually here since GlobalLoading takes no props - in the real app it's driven
// automatically by httpClient's request/response interceptors instead of a button click. The
// simulated call auto-stops after 3s (rather than needing a second click) since the overlay
// itself covers the whole viewport - including the button - while visible.
export const Default: Story = {
  render: () => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [loading, setLoading] = useState(false)

    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }, [])

    const simulateCall = () => {
      startLoading()
      setLoading(true)

      timeoutRef.current = setTimeout(() => {
        stopLoading()
        setLoading(false)
      }, 3000)
    }

    return (
      <>
        <Button disabled={loading} onClick={simulateCall}>
          {loading ? "Chamada em andamento..." : "Simular chamada de API"}
        </Button>
        <GlobalLoading />
      </>
    )
  },
}
