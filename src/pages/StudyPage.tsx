import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Pause, Play, Plus, MessageCircle, Send } from 'lucide-react'
import { FlashCard } from '../components/FlashCard'
import { StudyModeSelector, type StudyMode } from '../components/StudyModeSelector'
import { MultipleChoiceQuestion } from '../components/MultipleChoiceQuestion'
import { FillInTheBlank } from '../components/FillInTheBlank'
import { StudyResults } from '../components/StudyResults'
import { ChatBubble } from '../components/ChatBubble'
import { playSfx } from '../lib/sound'
import { useStudySession } from '../hooks/useStudySession'
import { useMixedStudySession } from '../hooks/useMixedStudySession'
import type { ConfidenceRating } from '../lib/sm2'
import type { Card } from '../store/useDecksStore'
import { getApiJsonHeaders } from '../lib/apiAuth'
import { useAiQuotaStore } from '../store/useAiQuotaStore'

// ── Confidence buttons ─────────────────────────────────────────────────────────

const CONFIDENCE: { label: string; rating: ConfidenceRating; color: string }[] = [
  { label: 'Again', rating: 'again', color: 'border-red-500/40 hover:bg-red-500/10 hover:border-red-500 text-red-500' },
  { label: 'Hard', rating: 'hard', color: 'border-orange-500/40 hover:bg-orange-500/10 hover:border-orange-500 text-orange-500' },
  { label: 'Good', rating: 'good', color: 'border-brand-blue/40 hover:bg-brand-blue/10 hover:border-brand-blue text-brand-blue' },
  { label: 'Easy', rating: 'easy', color: 'border-brand-green/40 hover:bg-brand-green/10 hover:border-brand-green text-brand-green' },
]

type TutorMsg = {
  id: string
  role: 'assistant' | 'user'
  text: string
}
type QuotaInfo = { dailyRemaining: number; dailyLimit: number }

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function cleanAiReply(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/(\d\.)\s*/g, '\n$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
    reviewMissedCards,
  } = useStudySession(deckId)
  const [mode, setMode] = useState<StudyMode | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [linearCards, setLinearCards] = useState<Card[]>([])
  const [linearIndex, setLinearIndex] = useState(0)
  const [linearCorrect, setLinearCorrect] = useState(0)
  const [linearByType, setLinearByType] = useState({
    flashcard: 0,
    multipleChoice: 0,
    fillInBlank: 0,
  })
  const [linearMissedIds, setLinearMissedIds] = useState<Set<string>>(new Set())
  const [linearAnswered, setLinearAnswered] = useState(false)
  const [mixedFlip, setMixedFlip] = useState(false)
  const [mixedAnswered, setMixedAnswered] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState('')
  const [askMessages, setAskMessages] = useState<TutorMsg[]>([])
  const askQuota = useAiQuotaStore((s) => s.tutorQuota)
  const setTutorQuota = useAiQuotaStore((s) => s.setTutorQuota)
  const [completionSfxPlayed, setCompletionSfxPlayed] = useState(false)
  const askThreadRef = useRef<HTMLDivElement | null>(null)
  const askBottomRef = useRef<HTMLDivElement | null>(null)

  const mixed = useMixedStudySession(linearCards)

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  const ratingByKey = useMemo(
    () =>
      new Map<string, ConfidenceRating>([
        ['1', 'again'],
        ['2', 'hard'],
        ['3', 'good'],
        ['4', 'easy'],
        ['Digit1', 'again'],
        ['Digit2', 'hard'],
        ['Digit3', 'good'],
        ['Digit4', 'easy'],
        ['Numpad1', 'again'],
        ['Numpad2', 'hard'],
        ['Numpad3', 'good'],
        ['Numpad4', 'easy'],
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
        playSfx('card_flip')
        setFlipped((prev) => !prev)
        return
      }

      if (e.key.toLowerCase() === 'p') {
        togglePause()
        return
      }

      if (mode !== 'flashcard') return

      const rating = ratingByKey.get(e.key) ?? ratingByKey.get(e.code)
      if (rating && flipped) {
        playSfx(rating === 'easy' || rating === 'good' ? 'answer_correct' : 'answer_wrong')
        rate(rating)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flipped, mode, rate, ratingByKey, togglePause, setFlipped])

  const handleAddCard = () => {
    if (!newFront.trim() || !newBack.trim()) return
    addCardToDeck(newFront.trim(), newBack.trim())
    setNewFront('')
    setNewBack('')
    setShowAddCard(false)
  }

  const dueOrAllCards = useMemo(() => {
    if (!deck) return []
    const due = deck.cards.filter((c) => c.dueDate === null || new Date(c.dueDate) <= new Date())
    return due.length > 0 ? due : deck.cards
  }, [deck])

  useEffect(() => {
    setSessionStarted(false)
    setMode(null)
    setLinearCards(dueOrAllCards)
    setLinearIndex(0)
    setLinearCorrect(0)
    setLinearByType({ flashcard: 0, multipleChoice: 0, fillInBlank: 0 })
    setLinearMissedIds(new Set())
    setLinearAnswered(false)
    setMixedFlip(false)
    setMixedAnswered(false)
    setCompletionSfxPlayed(false)
    // Only reset when switching deck routes; do not reset while studying
    // as SM-2 updates can change due-status on each answer.
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  const startSelectedMode = () => {
    if (!mode) return
    setLinearCards(dueOrAllCards)
    setLinearIndex(0)
    setLinearCorrect(0)
    setLinearByType({ flashcard: 0, multipleChoice: 0, fillInBlank: 0 })
    setLinearMissedIds(new Set())
    setLinearAnswered(false)
    setMixedFlip(false)
    setMixedAnswered(false)
    setCompletionSfxPlayed(false)
    setSessionStarted(true)
  }

  const currentLinearCard = linearCards[linearIndex] ?? null
  const contextCard = useMemo(() => {
    if (mode === 'flashcard') return currentCard
    if (mode === 'mixed') return mixed.currentCard
    return currentLinearCard
  }, [mode, currentCard, mixed.currentCard, currentLinearCard])

  const buildMCQOptions = (card: Card): string[] => {
    const distractors = linearCards
      .filter((c) => c.id !== card.id)
      .map((c) => c.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const opts = [card.back, ...distractors]
    while (opts.length < 4) opts.push(`None of the above (${opts.length + 1})`)
    return opts.sort(() => Math.random() - 0.5)
  }

  const linearMCQOptions = useMemo(
    () => (currentLinearCard ? buildMCQOptions(currentLinearCard) : []),
    [currentLinearCard], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const recordLinearAnswer = (isCorrect: boolean, type: 'multipleChoice' | 'fillInBlank') => {
    if (!currentLinearCard) return
    if (isCorrect) setLinearCorrect((prev) => prev + 1)
    if (!isCorrect) {
      setLinearMissedIds((prev) => new Set(prev).add(currentLinearCard.id))
    }
    setLinearByType((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }))
  }

  const nextLinear = () => {
    setLinearIndex((prev) => prev + 1)
    setLinearAnswered(false)
  }

  const linearComplete = linearIndex >= linearCards.length

  const restartLinearSession = () => {
    setLinearCards(dueOrAllCards)
    setLinearIndex(0)
    setLinearCorrect(0)
    setLinearByType({ flashcard: 0, multipleChoice: 0, fillInBlank: 0 })
    setLinearMissedIds(new Set())
    setLinearAnswered(false)
    setCompletionSfxPlayed(false)
  }

  const reviewMissedLinear = () => {
    const missed = linearCards.filter((c) => linearMissedIds.has(c.id))
    setLinearCards(missed)
    setLinearIndex(0)
    setLinearCorrect(0)
    setLinearByType({ flashcard: 0, multipleChoice: 0, fillInBlank: 0 })
    setLinearMissedIds(new Set())
    setLinearAnswered(false)
    setCompletionSfxPlayed(false)
  }

  useEffect(() => {
    if (!sessionStarted || completionSfxPlayed) return
    const completeNow =
      (mode === 'flashcard' && isComplete) ||
      (mode !== 'flashcard' && linearComplete) ||
      (mode === 'mixed' && mixed.sessionStats.isComplete)
    if (completeNow) {
      playSfx('session_complete')
      setCompletionSfxPlayed(true)
    }
  }, [
    sessionStarted,
    completionSfxPlayed,
    mode,
    isComplete,
    linearComplete,
    mixed.sessionStats.isComplete,
  ])

  useEffect(() => {
    setAskInput('')
    setAskError('')
    setAskMessages([])
  }, [contextCard?.id])

  useEffect(() => {
    if (!askThreadRef.current || !askBottomRef.current) return
    askBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [askMessages.length, askLoading])

  const askAIAboutCard = async () => {
    const question = askInput.trim()
    if (!question || !contextCard || askLoading) return

    setAskError('')
    setAskLoading(true)
    const userMsg: TutorMsg = { id: crypto.randomUUID(), role: 'user', text: question }
    setAskMessages((prev) => [...prev, userMsg])
    setAskInput('')

    const contextPrompt = [
      `Current deck: ${deck?.title ?? 'Unknown deck'}`,
      `Current mode: ${mode}`,
      `Given content (front): ${contextCard.front}`,
      `Given content (back): ${contextCard.back}`,
      `Learner question: ${question}`,
      'Please explain in simple terms first, then give one short real-world example.',
      'Response format: plain text only, no markdown symbols, concise paragraphs.',
    ].join('\n')

    try {
      const res = await fetch('/api/tutor-chat', {
        method: 'POST',
        headers: await getApiJsonHeaders(),
        body: JSON.stringify({
          messages: [
            ...askMessages.map((m) => ({ role: m.role, text: m.text })),
            { role: 'user', text: contextPrompt },
          ],
        }),
      })

      const raw = await res.text()
      const parsed = tryParseJson(raw) as { reply?: string; error?: string; quota?: QuotaInfo } | null
      if (parsed?.quota) setTutorQuota(parsed.quota)
      if (!res.ok || !parsed?.reply) {
        setAskError(parsed?.error ?? (raw.trim() ? raw : `Ask AI failed (HTTP ${res.status})`))
        return
      }

      setAskMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: cleanAiReply(parsed.reply as string) },
      ])
    } catch (e) {
      setAskError((e as Error).message)
    } finally {
      setAskLoading(false)
    }
  }

  if (!deck) {
    return (
      <div className="py-10 text-center text-muted">
        Deck not found.{' '}
        <button onClick={() => navigate('/decks')} className="text-brand-blue underline">Go back</button>
      </div>
    )
  }

  if (!sessionStarted) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <button
          onClick={() => navigate('/decks')}
          className="mb-1 flex items-center gap-1 text-xs text-muted hover:text-heading focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
        >
          ← All Decks
        </button>
        <h1 className="text-xl font-black text-heading">{deck.title}</h1>
        <StudyModeSelector selectedMode={mode} onSelectMode={setMode} onStart={startSelectedMode} />
      </div>
    )
  }

  if (mode === 'flashcard' && isComplete) {
    const correct = results.filter((r) => r.rating === 'good' || r.rating === 'easy').length
    const canReviewMissed = results.some((r) => r.rating === 'again' || r.rating === 'hard')
    return (
      <StudyResults
        total={results.length}
        correct={correct}
        byType={{ flashcard: results.length, multipleChoice: 0, fillInBlank: 0 }}
        onStudyAgain={restartSession}
        onBackToDeck={() => navigate('/decks')}
        onReviewMissed={reviewMissedCards}
        canReviewMissed={canReviewMissed}
      />
    )
  }

  if (mode !== 'flashcard' && linearComplete) {
    return (
      <StudyResults
        total={linearCards.length}
        correct={linearCorrect}
        byType={linearByType}
        onStudyAgain={restartLinearSession}
        onBackToDeck={() => navigate('/decks')}
        onReviewMissed={reviewMissedLinear}
        canReviewMissed={linearMissedIds.size > 0}
      />
    )
  }

  if (mode === 'mixed' && mixed.sessionStats.isComplete) {
    return (
      <StudyResults
        total={mixed.sessionStats.total}
        correct={mixed.sessionStats.correct}
        byType={mixed.sessionStats.byType}
        onStudyAgain={mixed.restart}
        onBackToDeck={() => navigate('/decks')}
        onReviewMissed={() => {
          const reviewCards = linearCards.filter((c) => mixed.sessionStats.missedCardIds.includes(c.id))
          mixed.setCardsForReview(reviewCards)
        }}
        canReviewMissed={mixed.sessionStats.missedCardIds.length > 0}
      />
    )
  }

  if (mode === 'flashcard' && !currentCard) return null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/decks')}
            className="mb-1 flex items-center gap-1 text-xs text-muted hover:text-heading focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
          >
            ← All Decks
          </button>
          <h1 className="text-xl font-black text-heading">{deck.title}</h1>
          <p className="text-xs text-muted capitalize">Mode: {mode}</p>
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

      {mode === 'flashcard' && currentCard && (
        <>
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
                onFlip={() => {
                  playSfx('card_flip')
                  setFlipped((prev) => !prev)
                }}
              />
            </motion.div>
          </AnimatePresence>

          {!flipped && (
            <p className="text-center text-xs text-dim">Tap the card to reveal the answer</p>
          )}

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
                    onClick={() => {
                      playSfx(rating === 'easy' || rating === 'good' ? 'answer_correct' : 'answer_wrong')
                      rate(rating)
                    }}
                    className={`rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-blue/60 ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {mode === 'multiple-choice' && currentLinearCard && (
        <MultipleChoiceQuestion
          prompt={currentLinearCard.front}
          options={linearMCQOptions}
          correctAnswer={currentLinearCard.back}
          explanation={currentLinearCard.back}
          onAnswered={(ok) => {
            playSfx(ok ? 'answer_correct' : 'answer_wrong')
            setLinearAnswered(true)
            recordLinearAnswer(ok, 'multipleChoice')
          }}
          onNext={nextLinear}
        />
      )}

      {mode === 'fill-in-blank' && currentLinearCard && (
        <FillInTheBlank
          prompt={currentLinearCard.front}
          correctAnswer={currentLinearCard.back}
          onAnswered={(ok) => {
            playSfx(ok ? 'answer_correct' : 'answer_wrong')
            setLinearAnswered(true)
            recordLinearAnswer(ok, 'fillInBlank')
          }}
          onNext={nextLinear}
        />
      )}

      {mode === 'mixed' && mixed.currentCard && (
        <>
          {mixed.currentType === 'flashcard' && (
            <section className="space-y-3">
              <FlashCard
                front={mixed.currentCard.front}
                back={mixed.currentCard.back}
                flipped={mixedFlip}
                onFlip={() => {
                  playSfx('card_flip')
                  setMixedFlip((prev) => !prev)
                }}
              />
              {mixedFlip && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('answer_wrong')
                      if (!mixedAnswered) mixed.submitAnswer(false)
                      setMixedAnswered(true)
                    }}
                    className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-500"
                  >
                    Missed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('answer_correct')
                      if (!mixedAnswered) mixed.submitAnswer(true)
                      setMixedAnswered(true)
                    }}
                    className="rounded-xl border border-brand-green/40 px-4 py-2 text-sm text-brand-green"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    disabled={!mixedAnswered}
                    onClick={() => {
                      mixed.next()
                      setMixedFlip(false)
                      setMixedAnswered(false)
                    }}
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )}

          {mixed.currentType === 'multiple-choice' && (
            <MultipleChoiceQuestion
              prompt={mixed.currentCard.front}
              options={buildMCQOptions(mixed.currentCard)}
              correctAnswer={mixed.currentCard.back}
              explanation={mixed.currentCard.back}
              onAnswered={(ok) => {
                playSfx(ok ? 'answer_correct' : 'answer_wrong')
                setMixedAnswered(true)
                mixed.submitAnswer(ok)
              }}
              onNext={() => {
                mixed.next()
                setMixedAnswered(false)
              }}
            />
          )}

          {mixed.currentType === 'fill-in-blank' && (
            <FillInTheBlank
              prompt={mixed.currentCard.front}
              correctAnswer={mixed.currentCard.back}
              onAnswered={(ok) => {
                playSfx(ok ? 'answer_correct' : 'answer_wrong')
                setMixedAnswered(true)
                mixed.submitAnswer(ok)
              }}
              onNext={() => {
                mixed.next()
                setMixedAnswered(false)
              }}
            />
          )}
        </>
      )}

      {contextCard && (
        <section className="rounded-2xl border border-edge bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand-blue" />
            <p className="text-sm font-semibold text-heading">Ask AI About This Card</p>
          </div>
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            AI usage limit: {askQuota ? `${askQuota.dailyRemaining}/${askQuota.dailyLimit} tutor queries remaining today` : '3 tutor queries per day per account.'}
          </p>

          <div className="rounded-xl border border-edge bg-inset p-3 text-sm">
            <p className="text-xs uppercase tracking-widest text-muted">Given content</p>
            <p className="mt-2 text-sub"><span className="font-semibold text-heading">Q:</span> {contextCard.front}</p>
            {(mode === 'flashcard' && flipped) ||
              (mode === 'multiple-choice' && linearAnswered) ||
              (mode === 'fill-in-blank' && linearAnswered) ||
              (mode === 'mixed' && ((mixed.currentType === 'flashcard' && mixedFlip) || mixedAnswered)) ? (
              <p className="mt-1 text-sub"><span className="font-semibold text-heading">A:</span> {contextCard.back}</p>
            ) : (
              <p className="mt-1 text-sub">
                <span className="font-semibold text-heading">A:</span> <span className="italic text-muted">Hidden until answered/revealed</span>
              </p>
            )}
          </div>

          <div
            ref={askThreadRef}
            className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-edge bg-inset p-3 pr-2"
          >
            {askMessages.length === 0 && !askLoading && (
              <p className="text-xs text-muted">
                Ask follow-up questions here. This thread is scoped to the current card.
              </p>
            )}
            {askMessages.map((m) => (
              <ChatBubble key={m.id} role={m.role} text={m.text} />
            ))}
            {askLoading && <p className="text-xs text-muted">Tuto is thinking…</p>}
            <div ref={askBottomRef} />
          </div>

          {askError && (
            <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {askError}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void askAIAboutCard()
                }
              }}
              placeholder="Ask Tuto the tuko about this question"
              className="flex-1 rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
            />
            <button
              type="button"
              onClick={() => void askAIAboutCard()}
              disabled={!askInput.trim() || askLoading}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-blue px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </section>
      )}

      {mode === 'flashcard' && (
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
      )}

      {/* Keyboard hint */}
      {mode === 'flashcard' && (
        <p className="text-center text-xs text-dim">
          <kbd className="rounded bg-rail px-1.5 py-0.5">Space</kbd> flip ·{' '}
          <kbd className="rounded bg-rail px-1.5 py-0.5">1</kbd>–
          <kbd className="rounded bg-rail px-1.5 py-0.5">4</kbd> rate
          {' '}· <kbd className="rounded bg-rail px-1.5 py-0.5">P</kbd> pause
        </p>
      )}
    </div>
  )
}

// ── Route component ────────────────────────────────────────────────────────────

export function StudyPage() {
  const navigate = useNavigate()
  const { deckId } = useParams<{ deckId?: string }>()

  // If someone hits /study without a deckId, redirect to decks
  useEffect(() => {
    if (!deckId) navigate('/decks', { replace: true })
  }, [deckId, navigate])

  if (!deckId) return null
  return <StudySession deckId={deckId} />
}
