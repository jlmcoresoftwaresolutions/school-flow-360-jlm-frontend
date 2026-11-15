// GET /api/access-matrix: what the backend enforces today, for reading only (reading it grants
// nothing). `published` stays false until the responsibilities matrix v2.0 (JLM-208) is approved; the
// rest of the document has no fixed shape yet.
export type AccessMatrix = {
  published: boolean
  [key: string]: unknown
}
