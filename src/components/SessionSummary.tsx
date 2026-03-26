import { motion } from 'framer-motion'
import { Trophy, RotateCcw, LayoutDashboard, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ConfidenceRating } from '../lib/sm2'
import type { SessionResult } from '../hooks/useStudySession'
import { getLevelInfo, streakMultiplier } from '../lib/xp'
import { useAppStore } from '../store/useAppStore'

type SessionSummaryProps = {
  deckTitle: string
  results: SessionResult[]
  sessionXP: number
  onRestart: () => void
}

const RATING_COLORS: Record<ConfidenceRating, string> = {
  again: 'text-red-500',
  hard: 'text-orange-500',
  good: 'text-brand-blue',
  easy: 'text-brand-green',
}

const RATING_BG: Record<ConfidenceRating, string> = {
  again: 'bg-red-500/15 border-red-500/30',
  hard: 'bg-orange-500/15 border-orange-500/30',
  good: 'bg-brand-blue/15 border-brand-blue/30',
  easy: 'bg-brand-green/15 border-brand-green/30',
}

export function SessionSummary({ deckTitle, results, sessionXP, onRestart }: SessionSummaryProps) {
  const navigate = useNavigate()
  const totalXp = useAppStore((s) => s.totalXp)
  const streak = useAppStore((s) => s.streak)
  const { level, current, max } = getLevelInfo(totalXp)
  const multiplier = streakMultiplier(streak)

  const counts = results.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] ?? 0) + 1
    return acc
  }, {} as Partial<Record<ConfidenceRating, number>>)

  const accuracy = results.length > 0
    ? Math.round((results.filter((r) => r.rating === 'good' || r.rating === 'easy').length / results.length) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-lg space-y-6 py-4"
    >
      {/* Hero */}
      <div className="rounded-3xl border border-brand-green/40 bg-brand-green/10 p-6 text-center">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-brand-green" />
        <h2 className="text-2xl font-black text-heading">Session Complete!</h2>
        <p className="mt-1 text-sub">{deckTitle}</p>
      </div>

      {/* XP earned */}
      <div className="rounded-2xl border border-brand-violet/40 bg-brand-violet/10 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-violet">XP Earned</p>
        <p className="mt-1 text-4xl font-black text-brand-violet">+{sessionXP}</p>
        {multiplier > 1 && (
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted">
            <Zap className="h-3 w-3 text-brand-green" />
            {multiplier}× streak bonus applied
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-edge bg-card p-4 text-center">
          <p className="text-2xl font-black text-heading">{results.length}</p>
          <p className="text-xs text-muted">Cards reviewed</p>
        </div>
        <div className="rounded-2xl border border-edge bg-card p-4 text-center">
          <p className="text-2xl font-black text-brand-green">{accuracy}%</p>
          <p className="text-xs text-muted">Accuracy</p>
        </div>
        <div className="rounded-2xl border border-edge bg-card p-4 text-center">
          <p className="text-2xl font-black text-brand-blue">Lv.{level}</p>
          <p className="text-xs text-muted">{current}/{max} XP</p>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="rounded-2xl border border-edge bg-card p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">Breakdown</p>
        <div className="grid grid-cols-2 gap-2">
          {(['again', 'hard', 'good', 'easy'] as ConfidenceRating[]).map((r) => (
            <div key={r} className={`rounded-xl border px-4 py-3 text-center ${RATING_BG[r]}`}>
              <p className={`text-lg font-black ${RATING_COLORS[r]}`}>{counts[r] ?? 0}</p>
              <p className="text-xs capitalize text-muted">{r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onRestart} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-edge py-3 text-sm text-sub hover:bg-heading/5">
          <RotateCcw className="h-4 w-4" /> Study Again
        </button>
        <button onClick={() => navigate('/')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-bold text-slate-950">
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </button>
      </div>
    </motion.div>
  )
}
