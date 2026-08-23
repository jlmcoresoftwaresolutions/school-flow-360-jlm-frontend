import { readFileSync } from "node:fs"

const allowedTypes = ["feat", "fix", "docs", "refactor"]
const subjectPattern = new RegExp(`^(${allowedTypes.join("|")})(\\(.+\\))?: .+$`)
const maxSubjectLength = 72

const commitMsgPath = process.argv[2]
const message = readFileSync(commitMsgPath, "utf8")
const subject = message.split("\n")[0]

if (!subjectPattern.test(subject)) {
  console.error(`Commit message must start with one of: ${allowedTypes.map((type) => `${type}:`).join(", ")}`)
  console.error(`Got: "${subject}"`)
  process.exit(1)
}

if (subject.length > maxSubjectLength) {
  console.error(`Commit subject line must be ${maxSubjectLength} characters or fewer (got ${subject.length}).`)
  console.error(`"${subject}"`)
  process.exit(1)
}
