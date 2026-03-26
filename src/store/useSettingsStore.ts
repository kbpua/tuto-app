import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

type SettingsState = {
  theme: ThemeMode
  soundEnabled: boolean
  freezeStreakOnBreak: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setSoundEnabled: (enabled: boolean) => void
  setFreezeStreakOnBreak: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      soundEnabled: true,
      freezeStreakOnBreak: false,

      setTheme(theme) {
        set({ theme })
      },

      toggleTheme() {
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }))
      },

      setSoundEnabled(enabled) {
        set({ soundEnabled: enabled })
      },

      setFreezeStreakOnBreak(enabled) {
        set({ freezeStreakOnBreak: enabled })
      },
    }),
    { name: 'tuto-settings' },
  ),
)
