import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'
import { resetApiClient } from '@/services/api'

interface SettingsStore extends AppSettings {
  updateSettings: (patch: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      backendUrl: 'http://localhost:8000',
      geminiApiKey: '',
      whisperModelSize: 'medium',
      outputDir: 'data/outputs',
      uploadDir: 'data/uploads',

      updateSettings: (patch) => {
        if (patch.backendUrl) resetApiClient()
        set((s) => ({ ...s, ...patch }))
      },
    }),
    { name: 'clipper-settings' }
  )
)
