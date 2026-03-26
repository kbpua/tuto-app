import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3, BrainCircuit, Zap } from 'lucide-react'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { StreakCounter } from '../components/StreakCounter'
import { XPBar } from '../components/XPBar'
import { useAppStore } from '../store/useAppStore'
import { useDecksStore } from '../store/useDecksStore'
import { useQuizStore } from '../store/useQuizStore'
import { heatmapData } from '../data/mockData'

export function DashboardPage() {
  const navigate = useNavigate()

  // ── Live store data ────────────────────────────────────────────────────────
  const totalXp = useAppStore((s) => s.totalXp)
  const streak = useAppStore((s) => s.streak)
  const getLevelInfo = useAppStore((s) => s.getLevelInfo)
  const studyHistory = useAppStore((s) => s.studyHistory)
  const studySecondsToday = useAppStore((s) => s.studySecondsToday)
  const { level, current, max } = getLevelInfo()

  const decks = useDecksStore((s) => s.decks)
  const getDueCount = useDecksStore((s) => s.getDueCount)
  const getMastery = useDecksStore((s) => s.getMastery)

  // Most recently studied deck, fallback to first
  const continueDeck = [...decks]
    .sort((a, b) => {
      if (!a.lastStudied) return 1
      if (!b.lastStudied) return -1
      return new Date(b.lastStudied).getTime() - new Date(a.lastStudied).getTime()
    })
    .find(Boolean)

  const totalDue = decks.reduce((acc, d) => acc + getDueCount(d.id), 0)

  const averageAccuracy = useQuizStore((s) => s.averageAccuracy)
  const recentAccuracyTrend = useQuizStore((s) => s.recentAccuracyTrend)
  const avgAccuracy =
    studyHistory.length > 0 || averageAccuracy() > 0
      ? Math.round(
          (studyHistory.reduce((acc, s) => acc + s.accuracy, 0) +
            averageAccuracy() * (averageAccuracy() > 0 ? 1 : 0)) /
            (studyHistory.length + (averageAccuracy() > 0 ? 1 : 0)),
        )
      : 0
  const studyTimeMinutes = Math.floor(studySecondsToday / 60)
  const trend = recentAccuracyTrend(7)
  const hasAnyProgress = studyHistory.length > 0 || trend.length > 0 || totalXp > 0

  return (
    <div className="space-y-6">
      {!hasAnyProgress && (
        <section className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-5">
          <p className="text-sm font-semibold text-brand-blue">Welcome to tuto</p>
          <h2 className="mt-1 text-2xl font-black text-slate-100">Ready for your first streak?</h2>
          <p className="mt-2 text-sm text-slate-300">
            Create a deck, add a few cards, then run a quick study sprint to start building momentum.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/decks')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950"
            >
              Create a deck <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/study')}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Explore study mode
            </button>
          </div>
        </section>
      )}

      {/* Top row: streak + XP + upcoming */}
      <section className="grid gap-4 lg:grid-cols-3">
        <StreakCounter streak={streak} />
        <XPBar current={current} max={max} level={level} />
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Upcoming Reviews</p>
          <p className={`mt-2 text-3xl font-black ${totalDue > 0 ? 'text-brand-green' : 'text-slate-400'}`}>
            {totalDue}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {totalDue > 0 ? 'cards in your SRS queue' : 'All caught up!  🎉'}
          </p>
        </article>
      </section>

      {/* Continue studying */}
      {continueDeck && (
        <section className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-5">
          <p className="text-sm font-semibold text-brand-blue">Continue Studying</p>
          <h2 className="mt-1 text-2xl font-black text-slate-100">{continueDeck.title}</h2>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-blue"
              style={{ width: `${getMastery(continueDeck.id)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
            <span>{getMastery(continueDeck.id)}% mastered · {getDueCount(continueDeck.id)} cards due</span>
            <button
              type="button"
              onClick={() => navigate(`/study/${continueDeck.id}`)}
              disabled={getDueCount(continueDeck.id) === 0}
              className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BrainCircuit className="h-3.5 w-3.5" /> Study Now
            </button>
          </div>
        </section>
      )}

      {/* Quick stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Total Decks</p>
          <p className="mt-2 text-3xl font-black text-slate-100">{decks.length}</p>
          <p className="mt-1 text-sm text-slate-400">
            {decks.reduce((acc, d) => acc + d.cards.length, 0)} total cards
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Avg. Accuracy</p>
          <p className="mt-2 text-3xl font-black text-brand-green">{avgAccuracy}%</p>
          <p className="mt-1 text-sm text-slate-400">study + quiz attempts</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Study Time</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black text-brand-violet">
            <Clock3 className="h-6 w-6" />{studyTimeMinutes}m
          </p>
          <p className="mt-1 text-sm text-slate-400">today</p>
        </article>
      </section>

      {/* Heatmap */}
      <ActivityHeatmap values={heatmapData} />

      {/* XP stats */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <p className="mb-2 flex items-center gap-2 text-slate-200">
          <Zap className="h-4 w-4 text-brand-green" /> Total XP Earned
        </p>
        <p className="text-3xl font-black text-brand-green">{totalXp.toLocaleString()} XP</p>
        <p className="mt-1 text-sm text-slate-400">
          Level {level} · {max - current} XP to next level
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">
          Quiz Accuracy Trend
        </p>
        {trend.length === 0 ? (
          <p className="text-sm text-slate-500">No quiz attempts yet. Complete a quiz to start the trend.</p>
        ) : (
          <div className="flex items-end gap-2">
            {trend.map((value, idx) => (
              <div key={`${value}-${idx}`} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-brand-violet to-brand-green"
                  style={{ height: `${Math.max(10, value)}px` }}
                />
                <span className="text-[10px] text-slate-500">{value}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
