import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatCreditCard,
  formatCurrency,
  formatExpiry,
  formatPhone,
} from "@/utils/formats"

export type MaskType = "cep" | "cnpj" | "cpf" | "creditCard" | "currency" | "expiry" | "phone"

const formatters: Record<MaskType, (value: string) => string> = {
  cep: formatCep,
  cnpj: formatCnpj,
  cpf: formatCpf,
  creditCard: formatCreditCard,
  currency: formatCurrency,
  expiry: formatExpiry,
  phone: formatPhone,
}

export const applyMask = (mask: MaskType, rawValue: string): string => formatters[mask](rawValue)
