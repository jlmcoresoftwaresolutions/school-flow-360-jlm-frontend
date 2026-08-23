import type { ComponentProps } from "react"
import { Col as GridSystemCol, Container as GridSystemContainer, Row as GridSystemRow } from "react-grid-system"

import { spacing } from "@/foundation"

export type GridColProps = Omit<ComponentProps<typeof GridSystemCol>, "ref">
export type GridContainerProps = Omit<ComponentProps<typeof GridSystemContainer>, "ref">
export type GridRowProps = Omit<ComponentProps<typeof GridSystemRow>, "ref">

const defaultGutterWidth = Number.parseInt(spacing[24], 10)

export const Grid = {
  Col: (props: GridColProps) => <GridSystemCol {...props} />,
  Container: (props: GridContainerProps) => <GridSystemContainer {...props} />,
  Row: (props: GridRowProps) => {
    const { gutterWidth, ...rest } = props

    return <GridSystemRow gutterWidth={gutterWidth ?? defaultGutterWidth} {...rest} />
  },
}
