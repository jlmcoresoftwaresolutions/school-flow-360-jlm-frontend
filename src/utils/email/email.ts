// The backend checks e-mails with Hibernate Validator's @Email, so the screens mirror its rules: a
// local part of dot-separated runs of the characters it allows (no leading, trailing or doubled dot),
// up to 64 characters, and a domain of dot-separated labels that start and end with a letter or digit
// (hyphens only inside), up to 63 characters each. Two differences are deliberate and only stricter:
// the domain needs at least one dot (the backend takes "contato@escola", which is never a real
// address), and quoted local parts ("john doe"@x.com) are refused.

const localPartAtom = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uFFFF-]+"
const localPartPattern = new RegExp(`^${localPartAtom}(?:\\.${localPartAtom})*$`, "iu")

const domainLabel = "[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]{0,61}[\\p{L}\\p{N}])?"
const domainPattern = new RegExp(`^${domainLabel}(?:\\.${domainLabel})+$`, "u")

const localPartMaxLength = 64
const domainMaxLength = 255

export const isValidEmail = (value: string): boolean => {
  const at = value.lastIndexOf("@")
  if (at <= 0) return false

  const localPart = value.slice(0, at)
  const domain = value.slice(at + 1)

  if (localPart.length > localPartMaxLength || domain.length > domainMaxLength) return false

  return localPartPattern.test(localPart) && domainPattern.test(domain)
}
