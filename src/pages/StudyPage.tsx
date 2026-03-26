import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BrainCircuit, Clock3, Layers, Pause, Play, Plus } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { SessionSummary } from '../components/SessionSummary'
import { useStudySession } from '../hooks/useStudySession'
import { useDecksStore } from '../store/useDecksStore'
import type { ConfidenceRating } from '../lib/sm2'

// ── Confidence buttons ─────────────────────────────────────────────────────────

const CONFIDENCE: { label: string; rating: ConfidenceRating; color: string }[] = [
  { label: 'Again', rating: 'again', color: 'border-red-500/40 hover:bg-red-500/10 hover:border-red-500 text-red-500' },
  { label: 'Hard', rating: 'hard', color: 'border-orange-500/40 hover:bg-orange-500/10 hover:border-orange-500 text-orange-500' },
  { label: 'Good', rating: 'good', color: 'border-brand-blue/40 hover:bg-brand-blue/10 hover:border-brand-blue text-brand-blue' },
  { label: 'Easy', rating: 'easy', color: 'border-brand-green/40 hover:bg-brand-green/10 hover:border-brand-green text-brand-green' },
]

// ── Deck Picker ────────────────────────────────────────────────────────────────

function DeckPicker() {
  const navigate = useNavigate()
  const decks = useDecksStore((s) => s.decks)
  const getDueCount = useDecksStore((s) => s.getDueCount)
  const getMastery = useDecksStore((s) => s.getMastery)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <BrainCircuit className="h-6 w-6 text-brand-blue" />
        <h1 className="text-2xl font-black text-heading">Pick a Deck to Study</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {decks.map((deck) => {
          const due = getDueCount(deck.id)
          const mastery = getMastery(deck.id)
          return (
            <button
              key={deck.id}
              type="button"
              onClick={() => navigate(`/study/${deck.id}`)}
              className="group rounded-2xl border border-edge bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-blue/50"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-heading group-hover:text-brand-blue">{deck.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${due > 0 ? 'bg-brand-green/20 text-brand-green' : 'bg-rail text-muted'}`}>
                  {due > 0 ? `${due} due` : 'All caught up'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted">
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{deck.cards.length} cards</span>
                <span>{mastery}% mastered</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-rail">
                <div className="h-full rounded-full bg-brand-violet" style={{ width: `${mastery}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Active Session ─────────────────────────────────────────────────────────────

function StudySession({ deckId }: { deckId: string }) {
  const navigate = useNavigate()
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const {
    deck,
    queue,
    currentCard,
    currentIndex,
    flipped,
    setFlipped,
    rate,
    isComplete,
    sessionXP,
    results,
    progress,
    restartSession,
    elapsedSeconds,
    addCardToDeck,
    isPaused,
    togglePause,
  } = useStudySession(deckId)

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  const ratingByKey = useMemo(
    () =>
      new Map<string, ConfidenceRating>([
        ['1', 'again'],
        ['2', 'hard'],
        ['3', 'good'],
        ['4', 'easy'],
      ]),
    [],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // If typing in inputs, ignore shortcuts
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return

      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((prev) => !prev)
        return
      }

      if (e.key.toLowerCase() === 'p') {
        togglePause()
        return
      }

      const rating = ratingByKey.get(e.key)
      if (rating && flipped) {
        rate(rating)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flipped, rate, ratingByKey, togglePause, setFlipped])

  const handleAddCard = () => {
    if (!newFront.trim() || !newBack.trim()) return
    addCardToDeck(newFront.trim(), newBack.trim())
    setNewFront('')
    setNewBack('')
    setShowAddCard(false)
  }

  if (!deck) {
    return (
      <div className="py-10 text-center text-muted">
        Deck not found.{' '}
        <button onClick={() => navigate('/study')} className="text-brand-blue underline">Go back</button>
      </div>
    )
  }

  if (isComplete) {
    return (
      <SessionSummary
        deckTitle={deck.title}
        results={results}
        sessionXP={sessionXP}
        onRestart={restartSession}
      />
    )
  }

  if (!currentCard) return null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/study')}
            className="mb-1 flex items-center gap-1 text-xs text-muted hover:text-heading focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
          >
            ← All Decks
          </button>
          <h1 className="text-xl font-black text-heading">{deck.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-edge bg-card px-3 py-2 text-xs text-sub">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5 text-brand-green" />
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            onClick={togglePause}
            className="inline-flex items-center gap-1 rounded-xl border border-edge bg-card px-3 py-2 text-xs text-sub hover:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <div className="rounded-xl border border-brand-violet/30 bg-brand-violet/10 px-4 py-2 text-sm text-brand-violet">
            +{sessionXP} XP this session
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-rail">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
          />
        </div>
        <p className="text-right text-xs text-muted">{currentIndex + 1} / {queue.length}</p>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <FlashCard
            front={currentCard.front}
            back={currentCard.back}
            flipped={flipped}
            onFlip={() => setFlipped((prev) => !prev)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Tap hint */}
      {!flipped && (
        <p className="text-center text-xs text-dim">Tap the card to reveal the answer</p>
      )}

      {/* Confidence buttons — only visible after flip */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {CONFIDENCE.map(({ label, rating, color }) => (
              <button
                key={rating}
                type="button"
                onClick={() => rate(rating)}
                className={`rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-blue/60 ${color}`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="rounded-2xl border border-edge bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted">
            Add card while studying
          </p>
          <button
            type="button"
            onClick={() => setShowAddCard((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-green/40 px-2.5 py-1.5 text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/60"
          >
            <Plus className="h-3 w-3" />
            {showAddCard ? 'Hide' : 'Add'}
          </button>
        </div>
        {showAddCard && (
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              placeholder="Front (question)"
              className="rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
            />
            <input
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Back (answer)"
              className="rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
            />
            <button
              type="button"
              onClick={handleAddCard}
              className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-green/60"
            >
              Save Card
            </button>
          </div>
        )}
      </section>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-dim">
        <kbd className="rounded bg-rail px-1.5 py-0.5">Space</kbd> flip ·{' '}
        <kbd className="rounded bg-rail px-1.5 py-0.5">1</kbd>–
        <kbd className="rounded bg-rail px-1.5 py-0.5">4</kbd> rate
        {' '}· <kbd className="rounded bg-rail px-1.5 py-0.5">P</kbd> pause
      </p>
    </div>
  )
}

// ── Route component ────────────────────────────────────────────────────────────

export function StudyPage() {
  const { deckId } = useParams<{ deckId?: string }>()
  return deckId ? <StudySession deckId={deckId} /> : <DeckPicker />
}
