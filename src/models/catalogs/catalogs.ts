// An entry of a controlled catalog (relationship types, document types): the code is what is sent, the
// label what is shown. `hasExpiry` says whether a document of that type has an expiry date.
export type CatalogItem = {
  code: string
  hasExpiry: boolean
  label: string
}
