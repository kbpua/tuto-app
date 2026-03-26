import { create } from 'zustand'

type CloudSyncState = {
  pendingCount: number
  lastStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastError: string | null
  lastSyncedAt: string | null
  setPendingCount: (count: number) => void
  setSyncing: () => void
  setSuccess: () => void
  setError: (message: string) => void
}

export const useCloudSyncStore = create<CloudSyncState>((set) => ({
  pendingCount: 0,
  lastStatus: 'idle',
  lastError: null,
  lastSyncedAt: null,
  setPendingCount(count) {
    set({ pendingCount: count })
  },
  setSyncing() {
    set({ lastStatus: 'syncing', lastError: null })
  },
  setSuccess() {
    set({ lastStatus: 'success', lastError: null, lastSyncedAt: new Date().toISOString() })
  },
  setError(message) {
    set({ lastStatus: 'error', lastError: message })
  },
}))
