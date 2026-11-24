// The product's own colors for the animated background of the screens before signing in (the body's,
// in GlobalStyle): a deep navy with three soft glows. colors.backdrop reads each from a CSS variable,
// falling back to these; a school's colors replace them with the same light in its own hue.
export const backdropPalette = {
  // The navy under everything.
  base: "#071E38",
  // The blue glow at the top left.
  glow: "#153E73",
  // The teal glow at the top right, which takes the school's accent.
  glowAccent: "#074D61",
  // The wide blue glow from the bottom right.
  glowLow: "#0B3768",
}

export type BackdropPaletteType = typeof backdropPalette
