export const translucency = {
  low: {
    backdropFilter: "blur(4px)",
    background: "rgba(255, 255, 255, 0.7)",
  },
  medium: {
    backdropFilter: "blur(14px)",
    background: "rgba(255, 255, 255, 0.4)",
  },
  high: {
    backdropFilter: "blur(24px)",
    background: "rgba(255, 255, 255, 0.1)",
  },
}

export type TranslucencyType = typeof translucency
