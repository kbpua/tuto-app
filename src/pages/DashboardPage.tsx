import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3, BrainCircuit, Zap, Flame, Star } from 'lucide-react'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
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
  const totalAttempts = useQuizStore((s) => s.totalAttempts)
  const bestAccuracy = useQuizStore((s) => s.bestAccuracy)
  const averageDurationSec = useQuizStore((s) => s.averageDurationSec)
  const strongAttemptStreak = useQuizStore((s) => s.strongAttemptStreak)
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
  const avgQuizDurationMin = Math.max(1, Math.round(averageDurationSec() / 60))
  const strongStreak = strongAttemptStreak(80)
  const hasAnyProgress = studyHistory.length > 0 || trend.length > 0 || totalXp > 0

  /* ── Helper: total cards across all decks ─────────────────────── */
  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0)

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Welcome CTA (first‑time users) ──────────────────────────── */}
      {!hasAnyProgress && (
        <section className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-5">
          <p className="text-sm font-semibold text-brand-blue">Welcome to tuto</p>
          <h2 className="mt-1 text-2xl font-black text-heading">Ready for your first streak?</h2>
          <p className="mt-2 text-sm text-sub">
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
              onClick={() => navigate('/decks')}
              className="rounded-xl border border-edge px-4 py-2 text-sm text-sub hover:bg-heading/5"
            >
              Explore study mode
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          1. STATS ROW  – 3 compact cards, always horizontal
          On mobile: single tight row  |  On desktop: full‑width grid
          ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Streak */}
        <article className="min-w-0 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-2.5 sm:p-5">
          <Flame className="h-4 w-4 text-orange-500 sm:h-6 sm:w-6" />
          <p className="mt-1 truncate text-base font-black text-orange-500 sm:text-3xl">{streak}</p>
          <p className="truncate text-[9px] uppercase tracking-wider text-muted sm:text-xs">Day Streak</p>
        </article>

        {/* XP Level */}
        <article className="min-w-0 rounded-2xl border border-edge bg-card p-2.5 shadow-neon sm:p-5">
          <Star className="h-4 w-4 text-brand-violet sm:h-6 sm:w-6" />
          <p className="mt-1 truncate text-base font-black text-brand-violet sm:text-3xl">Lv.{level}</p>
          <p className="truncate text-[9px] uppercase tracking-wider text-muted sm:text-xs">{current}/{max} XP</p>
        </article>

        {/* Total XP */}
        <article className="min-w-0 rounded-2xl border border-edge bg-card p-2.5 sm:p-5">
          <Zap className="h-4 w-4 text-brand-green sm:h-6 sm:w-6" />
          <p className="mt-1 truncate text-base font-black text-brand-green sm:text-3xl">{totalXp.toLocaleString()}</p>
          <p className="truncate text-[9px] uppercase tracking-wider text-muted sm:text-xs">Total XP</p>
        </article>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. CONTENT CARDS  – horizontal scroll with snap on mobile,
             regular grid on desktop
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="
          -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2
          scrollbar-hide
          lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0
        "
      >
        {/* Upcoming Reviews */}
        <article className="min-w-[75%] flex-shrink-0 snap-center rounded-2xl border border-edge bg-card p-5 sm:min-w-[45%] lg:min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted">Upcoming Reviews</p>
          <p className={`mt-2 text-3xl font-black ${totalDue > 0 ? 'text-brand-green' : 'text-muted'}`}>
            {totalDue}
          </p>
          <p className="mt-1 text-sm text-sub">
            {totalDue > 0 ? 'cards in your SRS queue' : 'All caught up! 🎉'}
          </p>
        </article>

        {/* Continue Studying */}
        {continueDeck ? (
          <article className="min-w-[75%] flex-shrink-0 snap-center rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-5 sm:min-w-[45%] lg:min-w-0">
            <p className="text-xs font-semibold text-brand-blue">Continue Studying</p>
            <h2 className="mt-1 text-xl font-black text-heading sm:text-2xl">{continueDeck.title}</h2>
            <div className="mt-3 h-2 rounded-full bg-rail">
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ width: `${getMastery(continueDeck.id)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-sub">
              <span>{getMastery(continueDeck.id)}% mastered · {getDueCount(continueDeck.id)} cards due</span>
              <button
                type="button"
                onClick={() => navigate(`/study/${continueDeck.id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                <BrainCircuit className="h-3.5 w-3.5" />{getDueCount(continueDeck.id) > 0 ? 'Study Now' : 'Restudy deck'}
              </button>
            </div>
          </article>
        ) : (
          <article className="min-w-[75%] flex-shrink-0 snap-center rounded-2xl border border-edge bg-card p-5 sm:min-w-[45%] lg:min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted">Continue Studying</p>
            <p className="mt-2 text-sm text-sub">No decks yet — create one to get started!</p>
          </article>
        )}

        {/* Total Decks */}
        <article className="min-w-[75%] flex-shrink-0 snap-center rounded-2xl border border-edge bg-card p-5 sm:min-w-[45%] lg:min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted">Total Decks</p>
          <p className="mt-2 text-3xl font-black text-heading">{decks.length}</p>
          <p className="mt-1 text-sm text-muted">{totalCards} total cards</p>
        </article>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. QUICK STATS  – accuracy, study time (grid on all sizes)
          ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <article className="rounded-2xl border border-edge bg-card p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted sm:text-xs">Avg. Accuracy</p>
          <p className="mt-1 text-2xl font-black text-brand-green sm:text-3xl">{avgAccuracy}%</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">study + quiz</p>
        </article>
        <article className="rounded-2xl border border-edge bg-card p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted sm:text-xs">Study Time</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-black text-brand-violet sm:text-3xl">
            <Clock3 className="h-5 w-5 sm:h-6 sm:w-6" />{studyTimeMinutes}m
          </p>
          <p className="mt-1 text-xs text-muted sm:text-sm">today</p>
        </article>
        {/* Third cell only visible on sm+ to avoid orphan column on mobile */}
        <article className="col-span-2 rounded-2xl border border-edge bg-card p-4 sm:col-span-1 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted sm:text-xs">Total Cards</p>
          <p className="mt-1 text-2xl font-black text-brand-blue sm:text-3xl">{totalCards}</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">across {decks.length} decks</p>
        </article>
      </section>

      {/* ── Heatmap ─────────────────────────────────────────────────── */}
      <ActivityHeatmap values={heatmapData} />

      {/* ── Quiz Accuracy Trend ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-edge bg-card p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">
          Quiz Accuracy Trend
        </p>
        {trend.length === 0 ? (
          <p className="text-sm text-dim">No quiz attempts yet. Complete a quiz to start the trend.</p>
        ) : (
          <div className="flex items-end gap-2">
            {trend.map((value, idx) => (
              <div key={`${value}-${idx}`} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-brand-violet to-brand-green"
                  style={{ height: `${Math.max(10, value)}px` }}
                />
                <span className="text-[10px] text-dim">{value}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quiz Performance ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-edge bg-card p-5">
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">Quiz Performance</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-edge bg-inset p-3 sm:p-4">
            <p className="text-[10px] text-muted sm:text-xs">Total attempts</p>
            <p className="mt-1 text-xl font-black text-heading sm:text-2xl">{totalAttempts()}</p>
          </div>
          <div className="rounded-xl border border-edge bg-inset p-3 sm:p-4">
            <p className="text-[10px] text-muted sm:text-xs">Best accuracy</p>
            <p className="mt-1 text-xl font-black text-brand-green sm:text-2xl">{bestAccuracy()}%</p>
          </div>
          <div className="rounded-xl border border-edge bg-inset p-3 sm:p-4">
            <p className="text-[10px] text-muted sm:text-xs">Avg duration</p>
            <p className="mt-1 text-xl font-black text-brand-blue sm:text-2xl">{avgQuizDurationMin}m</p>
          </div>
          <div className="rounded-xl border border-edge bg-inset p-3 sm:p-4">
            <p className="text-[10px] text-muted sm:text-xs">80%+ streak</p>
            <p className="mt-1 text-xl font-black text-brand-violet sm:text-2xl">{strongStreak}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
