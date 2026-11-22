// What a person is called on screen: the name, or else the e-mail, or else the nickname (every account
// has one, and a person without e-mail signs in with it). Empty only for a reading that has none of them.
export type NamedPerson = {
  email: string | null
  fullName: string | null
  nickname?: string | null
}

export const getPersonName = (person: NamedPerson): string =>
  person.fullName?.trim() || person.email || person.nickname || ""
