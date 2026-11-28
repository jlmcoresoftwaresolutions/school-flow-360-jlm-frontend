import { useState } from "react"

import { getFinanceCommand } from "@/services/financeFoundation"
import { getErrorStatus } from "@/services/httpClient"

// One intent per attempt the person understands as one (a dialog opening), and the way to recover a lost
// answer: the financial module stores every command's result by its intent in the same transaction as its
// effect, so a command that may have run is looked up instead of sent blindly again.
export const useFinanceCommand = () => {
  const [intent] = useState(() => crypto.randomUUID())

  // True when the command with this intent already ran (the answer was lost on the way).
  const ranMeanwhile = async () => {
    try {
      const command = await getFinanceCommand(intent, { showLoading: false })
      return command.status !== "FAILED"
    } catch {
      return false
    }
  }

  // True when the error is a lost answer (no status at all): the command may have run.
  const isLostAnswer = (error: unknown) => getErrorStatus(error) === undefined

  return { intent, isLostAnswer, ranMeanwhile }
}
