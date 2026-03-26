import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type QuotaInfo = {
  dailyRemaining: number
  dailyLimit: number
}

type AiQuotaState = {
  tutorQuota: QuotaInfo | null
  importQuota: QuotaInfo | null
  setTutorQuota: (quota: QuotaInfo) => void
  setImportQuota: (quota: QuotaInfo) => void
}

export const useAiQuotaStore = create<AiQuotaState>()(
  persist(
    (set) => ({
      tutorQuota: null,
      importQuota: null,
      setTutorQuota: (quota) => set({ tutorQuota: quota }),
      setImportQuota: (quota) => set({ importQuota: quota }),
    }),
    {
      name: 'tuto-ai-quota',
    },
  ),
)
