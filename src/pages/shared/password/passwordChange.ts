// The backend's password policy: 12 to 128 characters, nothing else required.
export const passwordLength = { max: 128, min: 12 }

// The fields of a password change: the current password (the temporary one, when a temporary password
// forces the change), the new one and its confirmation.
export type PasswordChangeValues = {
  confirmPassword: string
  currentPassword: string
  newPassword: string
}

export const emptyPasswordChange: PasswordChangeValues = { confirmPassword: "", currentPassword: "", newPassword: "" }
