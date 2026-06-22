import axios, { AxiosError, type AxiosInstance } from 'axios'
import { useSettingsStore } from '@/store/settings.store'

let apiInstance: AxiosInstance | null = null

export function getApiClient(): AxiosInstance {
  const { backendUrl } = useSettingsStore.getState()

  if (!apiInstance || apiInstance.defaults.baseURL !== backendUrl) {
    apiInstance = axios.create({
      baseURL: backendUrl,
      timeout: 300_000, // 5 min — transcription can be slow
      headers: { 'Content-Type': 'application/json' },
    })

    apiInstance.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const message =
          (err.response?.data as { message?: string })?.message ||
          err.message ||
          'Unknown error'
        return Promise.reject(new Error(message))
      }
    )
  }

  return apiInstance
}

export function resetApiClient() {
  apiInstance = null
}
