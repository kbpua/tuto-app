import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { executeOrQueue } from '../lib/cloudSyncQueue'
import { fetchQuizAttempts } from '../lib/db'

export type QuizAttempt = {
  id: string
  date: string
  totalQuestions: number
  correctAnswers: number
  durationSec: number
}

type QuizState = {
  attempts: QuizAttempt[]
  resetAttempts: () => void
  recordAttempt: (attempt: Omit<QuizAttempt, 'id' | 'date'>) => void
  hydrateAttemptsFromCloud: () => Promise<void>
  averageAccuracy: () => number
  recentAccuracyTrend: (count?: number) => number[]
  totalAttempts: () => number
  bestAccuracy: () => number
  averageDurationSec: () => number
  strongAttemptStreak: (threshold?: number) => number
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      attempts: [],

      resetAttempts() {
        set({ attempts: [] })
      },

      recordAttempt(attempt) {
        set((s) => ({
          attempts: [
            { id: crypto.randomUUID(), date: new Date().toISOString(), ...attempt },
            ...s.attempts,
          ].slice(0, 50),
        }))
        void executeOrQueue({
          type: 'recordQuizAttempt',
          payload: {
            totalQuestions: attempt.totalQuestions,
            correctAnswers: attempt.correctAnswers,
            durationSec: attempt.durationSec,
          },
        })
      },

      async hydrateAttemptsFromCloud() {
        const rows = await fetchQuizAttempts(50)
        if (rows.length === 0) return
        set({
          attempts: rows.map((r) => ({
            id: r.id,
            date: r.created_at,
            totalQuestions: r.total_questions,
            correctAnswers: r.correct_answers,
            durationSec: r.duration_sec,
          })),
        })
      },

      averageAccuracy() {
        const attempts = get().attempts
        if (attempts.length === 0) return 0
        const total = attempts.reduce(
          (acc, a) => acc + (a.correctAnswers / a.totalQuestions) * 100,
          0,
        )
        return Math.round(total / attempts.length)
      },

      recentAccuracyTrend(count = 7) {
        return [...get().attempts]
          .slice(0, count)
          .reverse()
          .map((a) => Math.round((a.correctAnswers / a.totalQuestions) * 100))
      },

      totalAttempts() {
        return get().attempts.length
      },

      bestAccuracy() {
        const attempts = get().attempts
        if (attempts.length === 0) return 0
        return Math.max(
          ...attempts.map((a) =>
            Math.round((a.correctAnswers / Math.max(a.totalQuestions, 1)) * 100),
          ),
        )
      },

      averageDurationSec() {
        const attempts = get().attempts
        if (attempts.length === 0) return 0
        const total = attempts.reduce((acc, a) => acc + a.durationSec, 0)
        return Math.round(total / attempts.length)
      },

      strongAttemptStreak(threshold = 80) {
        const attempts = get().attempts
        if (attempts.length === 0) return 0
        let streak = 0
        for (const a of attempts) {
          const acc = Math.round((a.correctAnswers / Math.max(a.totalQuestions, 1)) * 100)
          if (acc >= threshold) streak += 1
          else break
        }
        return streak
      },
    }),
    { name: 'studyforge-quiz' },
  ),
)
