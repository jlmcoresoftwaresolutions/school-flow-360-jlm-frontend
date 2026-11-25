import { stripNonDigits } from "@/utils/formats"

// A Brazilian CPF's check digit for the digits before it: each weighs from its position, counting down
// to 2, and the remainder of the sum by 11 gives the digit (0 when it is under 2).
const cpfCheckDigit = (digits: string): number => {
  const weightStart = digits.length + 1
  const sum = digits.split("").reduce((total, digit, index) => total + Number(digit) * (weightStart - index), 0)
  const remainder = sum % 11

  return remainder < 2 ? 0 : 11 - remainder
}

// Whether a CPF (formatted or not) has 11 digits whose two check digits match. Eleven equal digits
// (000.000.000-00, 111.111.111-11...) pass the arithmetic but are not real, so they are refused too.
export const isValidCpf = (value: string): boolean => {
  const digits = stripNonDigits(value)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const first = cpfCheckDigit(digits.slice(0, 9))
  const second = cpfCheckDigit(digits.slice(0, 10))

  return first === Number(digits[9]) && second === Number(digits[10])
}
