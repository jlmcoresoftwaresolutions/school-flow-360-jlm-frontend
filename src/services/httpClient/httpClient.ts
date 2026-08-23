import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import axios from "axios"

import { startLoading, stopLoading } from "@/utils/loadingStore"

declare module "axios" {
  interface AxiosRequestConfig {
    showLoading?: boolean
  }
}

// The single config object every service function accepts, on top of its own arguments - kept
// as its own type (rather than exposing all of AxiosRequestConfig) so callers only ever see the
// options this app actually wants to offer, with room to grow (e.g. a future skipErrorToast).
export type RequestConfig = Pick<AxiosRequestConfig, "showLoading">

// Shared axios instance every service must use instead of importing axios directly, so every API
// call automatically shows the global Loading overlay unless it opts out via config.showLoading.
export const httpClient = axios.create()

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.showLoading !== false) startLoading()

  return config
})

httpClient.interceptors.response.use(
  (response) => {
    if (response.config.showLoading !== false) stopLoading()

    return response
  },
  async (error) => {
    if (error.config?.showLoading !== false) stopLoading()

    return Promise.reject(error)
  },
)
