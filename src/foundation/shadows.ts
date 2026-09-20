// Each level pairs a directional "key light" shadow (offset downward, as if lit from above) with
// a 0-offset "ambient" layer (last in each list) that spreads evenly on every side - without it,
// blur alone can't reach past the element's top edge once offset-y approaches the blur radius, so
// elevated elements read as shadowed only below/beside themselves, never above.
export const shadows = {
  none: "none",
  xs: "0 1px 2px rgba(0,0,0,.05), 0 0 2px rgba(0,0,0,.04)",
  sm: "0 2px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06), 0 0 3px rgba(0,0,0,.05)",
  md: "0 6px 7px -1px rgba(0,0,0,.14), 0 2px 3px -2px rgba(0,0,0,.1), 0 0 5px rgba(0,0,0,.06)",
  lg: "0 14px 14px -3px rgba(0,0,0,.18), 0 6px 6px -4px rgba(0,0,0,.12), 0 0 7px rgba(0,0,0,.08)",
  xl: "0 26px 24px -6px rgba(0,0,0,.24), 0 10px 10px -6px rgba(0,0,0,.14), 0 0 9px rgba(0,0,0,.1)",
  "2xl": "0 42px 45px -14px rgba(0,0,0,.32), 0 0 12px rgba(0,0,0,.12)",
}

export type ShadowsType = typeof shadows
