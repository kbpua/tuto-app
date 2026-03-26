// ─── App-level persistent store ───────────────────────────────────────────────
// Holds XP, level, and daily streak. Persisted to localStorage via zustand/persist.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { executeOrQueue } from '../lib/cloudSyncQueue'
import { fetchStudySessions } from '../lib/db'
import { fetchUserProgress } from '../lib/db'
import { getLevelInfo } from '../lib/xp'
import { useSettingsStore } from './useSettingsStore'

type StudySessionLog = {
  id: string
  date: string
  deckId: string
  cardsReviewed: number
  accuracy: number
  durationSec: number
  xpEarned: number
}

type AppState = {
  totalXp: number
  streak: number
  lastStudiedDate: string | null // 'YYYY-MM-DD'
  studySecondsToday: number
  studySecondsDate: string
  studyHistory: StudySessionLog[]

  // Derived helpers (read-only, computed on the fly)
  getLevelInfo: () => ReturnType<typeof getLevelInfo>

  // Actions
  addXP: (amount: number) => void
  checkAndUpdateStreak: () => void
  addStudySeconds: (seconds: number) => void
  recordStudySession: (session: Omit<StudySessionLog, 'id' | 'date'>) => void
  hydrateStudyHistoryFromCloud: () => Promise<void>
  hydrateProgressFromCloud: () => Promise<void>
  resetStats: () => void
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      totalXp: 1840,
      streak: 14,
      lastStudiedDate: yesterdayString(), // makes streak update on first session
      studySecondsToday: 0,
      studySecondsDate: todayString(),
      studyHistory: [],

      getLevelInfo() {
        return getLevelInfo(get().totalXp)
      },

      addXP(amount) {
        let nextTotalXp = 0
        let nextStreak = 0
        let nextLastStudiedDate: string | null = null
        set((s) => {
          nextTotalXp = s.totalXp + amount
          nextStreak = s.streak
          nextLastStudiedDate = s.lastStudiedDate
          return { totalXp: nextTotalXp }
        })
        void executeOrQueue({
          type: 'upsertUserProgress',
          payload: {
            totalXp: nextTotalXp,
            streak: nextStreak,
            lastStudiedDate: nextLastStudiedDate,
          },
        })
      },

      checkAndUpdateStreak() {
        const today = todayString()
        const yesterday = yesterdayString()
        const last = get().lastStudiedDate
        const freezeStreakOnBreak = useSettingsStore.getState().freezeStreakOnBreak

        if (last === today) return // already counted today

        let nextTotalXp = 0
        let nextStreak = 0
        let nextLastStudiedDate: string | null = null
        set((s) => {
          nextTotalXp = s.totalXp
          nextStreak = last === yesterday || freezeStreakOnBreak ? s.streak + 1 : 1
          nextLastStudiedDate = today
          return {
            streak: nextStreak,
            lastStudiedDate: nextLastStudiedDate,
          }
        })
        void executeOrQueue({
          type: 'upsertUserProgress',
          payload: {
            totalXp: nextTotalXp,
            streak: nextStreak,
            lastStudiedDate: nextLastStudiedDate,
          },
        })
      },

      addStudySeconds(seconds) {
        const today = todayString()
        set((s) => ({
          studySecondsDate: today,
          studySecondsToday:
            s.studySecondsDate === today ? s.studySecondsToday + seconds : seconds,
        }))
      },

      recordStudySession(session) {
        const today = todayString()
        set((s) => ({
          studyHistory: [
            {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              ...session,
            },
            ...s.studyHistory,
          ].slice(0, 40),
          studySecondsDate: today,
          studySecondsToday:
            s.studySecondsDate === today
              ? s.studySecondsToday + session.durationSec
              : session.durationSec,
        }))
        void executeOrQueue({
          type: 'recordStudySession',
          payload: {
            deckId: session.deckId,
            cardsReviewed: session.cardsReviewed,
            accuracy: session.accuracy,
            durationSec: session.durationSec,
            xpEarned: session.xpEarned,
          },
        })
      },

      async hydrateStudyHistoryFromCloud() {
        const rows = await fetchStudySessions(40)
        if (rows.length === 0) return
        const today = todayString()
        const todaySeconds = rows
          .filter((r) => r.created_at.slice(0, 10) === today)
          .reduce((acc, r) => acc + r.duration_sec, 0)

        set({
          studyHistory: rows.map((r) => ({
            id: r.id,
            date: r.created_at,
            deckId: r.deck_id ?? 'unknown',
            cardsReviewed: r.cards_reviewed,
            accuracy: Math.round(Number(r.accuracy)),
            durationSec: r.duration_sec,
            xpEarned: r.xp_earned,
          })),
          studySecondsDate: today,
          studySecondsToday: todaySeconds,
        })
      },

      async hydrateProgressFromCloud() {
        const progress = await fetchUserProgress()
        if (!progress) return
        set({
          totalXp: progress.total_xp,
          streak: progress.streak,
          lastStudiedDate: progress.last_studied_date,
        })
      },

      resetStats() {
        const today = todayString()
        set({
          totalXp: 0,
          streak: 0,
          lastStudiedDate: null,
          studySecondsToday: 0,
          studySecondsDate: today,
          studyHistory: [],
        })
        void executeOrQueue({
          type: 'upsertUserProgress',
          payload: {
            totalXp: 0,
            streak: 0,
            lastStudiedDate: null,
          },
        })
      },
    }),
    { name: 'studyforge-app' },
  ),
)
