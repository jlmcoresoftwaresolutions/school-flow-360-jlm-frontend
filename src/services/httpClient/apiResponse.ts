import type { AxiosResponse } from "axios"

import type { ApiResponse } from "@/models"

// Takes the payload out of the backend's envelope (`ApiResponse<T>`), for every service that returns
// data. A success without a payload is not expected from those endpoints, so it throws rather than
// handing the caller a null to check. An endpoint that returns nothing (a delete, a logout) does not
// use this.
export const unwrapApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  const data = response.data.data

  if (data === null || data === undefined) throw new Error("The response has no data.")

  return data
}

// The body of a multipart upload: the backend takes one file in the `file` field. The Swagger declares
// these bodies as application/json, but its descriptions say multipart/form-data; axios sets the
// content type (and its boundary) itself when it is given a FormData.
export const toFileFormData = (file: File): FormData => {
  const formData = new FormData()
  formData.append("file", file)

  return formData
}
