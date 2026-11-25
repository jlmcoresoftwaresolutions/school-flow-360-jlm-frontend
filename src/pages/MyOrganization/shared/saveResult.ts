// What a save ended in, for the form that asked: closed only when "saved"; kept with its draft when
// "failed"; kept with its draft and a notice when "conflict" - someone else changed the record since it
// was read, and the form now has the current version to show and the new `version` to save with.
export type SaveResult = "conflict" | "failed" | "saved"
