// Money in the financial module (P07) always travels as whole cents plus the currency, never as a floating
// point. These helpers only show it: the arithmetic stays on the backend.

// Shows an amount of cents in the given language and currency ("R$ 1.234,56" in pt-BR).
export const formatCents = (cents: number, language: string, currency = "BRL"): string =>
  new Intl.NumberFormat(language, { currency, style: "currency" }).format(cents / 100)

// Reads a typed amount ("1.234,56", "1234.56", "R$ 12") into whole cents, or null when it isn't one. The
// last "," or "." followed by one or two digits is the decimal separator; any other is a thousands one.
export const parseCents = (value: string): number | null => {
  const text = value.replace(/[^\d.,]/g, "")
  if (!/\d/.test(text)) return null
  const match = /^(.*?)[.,](\d{1,2})$/.exec(text)
  const integer = (match ? match[1] : text).replace(/[.,]/g, "")
  const fraction = match ? match[2].padEnd(2, "0") : "00"
  if (!/^\d*$/.test(integer)) return null
  return Number(integer || "0") * 100 + Number(fraction)
}
