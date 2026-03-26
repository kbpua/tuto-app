// ─── useStudySession ──────────────────────────────────────────────────────────
// Manages an active flashcard study session for a given deck.
// Orchestrates SM-2 scheduling, XP rewards, and streak updates.

import { useCallback, useEffect, useState } from 'react'
import type { ConfidenceRating } from '../lib/sm2'
import { isCardDue } from '../lib/sm2'
import { computeXP } from '../lib/xp'
import { useAppStore } from '../store/useAppStore'
import { useDecksStore } from '../store/useDecksStore'
import type { Card } from '../store/useDecksStore'

export type SessionResult = {
  card: Card
  rating: ConfidenceRating
  xpAwarded: number
}

const MAX_REQUEUE_PER_CARD_PER_SESSION = 3

export function useStudySession(deckId: string | undefined) {
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === deckId))
  const updateCardSM2 = useDecksStore((s) => s.updateCardSM2)
  const markDeckStudied = useDecksStore((s) => s.markDeckStudied)
  const addCard = useDecksStore((s) => s.addCard)

  const totalXp = useAppStore((s) => s.totalXp)
  const streak = useAppStore((s) => s.streak)
  const addXP = useAppStore((s) => s.addXP)
  const checkAndUpdateStreak = useAppStore((s) => s.checkAndUpdateStreak)
  const recordStudySession = useAppStore((s) => s.recordStudySession)

  const [queue, setQueue] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<SessionResult[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [sessionXP, setSessionXP] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [requeueCounts, setRequeueCounts] = useState<Record<string, number>>({})

  // Build the due-card queue whenever the deck changes
  useEffect(() => {
    if (!deck) return
    const due = deck.cards.filter((c) => isCardDue(c.dueDate))
    setQueue(due)
    setCurrentIndex(0)
    setFlipped(false)
    setResults([])
    setSessionXP(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setRequeueCounts({})
    setIsComplete(due.length === 0)
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isComplete || queue.length === 0 || isPaused) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isComplete, queue.length, isPaused])

  const currentCard = queue[currentIndex] ?? null

  const rate = useCallback(
    (rating: ConfidenceRating) => {
      if (!currentCard || !deckId) return

      // 1. Persist updated SM-2 state to the deck store
      updateCardSM2(deckId, currentCard.id, rating)

      // 2. Award XP (streak-multiplied)
      const xp = computeXP(rating, streak)
      addXP(xp)
      setSessionXP((prev) => prev + xp)

      // 3. Record result for the summary screen
      setResults((prev) => [
        ...prev,
        { card: currentCard, rating, xpAwarded: xp },
      ])

      // 4. Anki-style relearning: non-easy cards reappear later in the same run.
      // This keeps failed/hard cards in active rotation without creating infinite loops.
      const requeuedSoFar = requeueCounts[currentCard.id] ?? 0
      const shouldRequeue =
        rating !== 'easy' && requeuedSoFar < MAX_REQUEUE_PER_CARD_PER_SESSION

      if (shouldRequeue) {
        setQueue((prev) => [...prev, currentCard])
        setRequeueCounts((prev) => ({
          ...prev,
          [currentCard.id]: (prev[currentCard.id] ?? 0) + 1,
        }))
      }

      // 5. Advance queue or finish session.
      // If this was the last visible card but got requeued, move forward to that requeued item.
      const isLastVisible = currentIndex >= queue.length - 1
      if (isLastVisible && !shouldRequeue) {
        markDeckStudied(deckId)
        checkAndUpdateStreak()
        const accuracy = Math.round(
          (([...results, { card: currentCard, rating, xpAwarded: xp }].filter(
            (r) => r.rating === 'good' || r.rating === 'easy',
          ).length /
            queue.length) *
            100),
        )
        recordStudySession({
          deckId,
          cardsReviewed: results.length + 1,
          accuracy,
          durationSec: elapsedSeconds,
          xpEarned: sessionXP + xp,
        })
        setIsComplete(true)
      } else {
        setCurrentIndex((prev) => prev + 1)
        setFlipped(false)
      }
    },
    [
      currentCard,
      deckId,
      currentIndex,
      queue.length,
      streak,
      addXP,
      updateCardSM2,
      markDeckStudied,
      checkAndUpdateStreak,
      recordStudySession,
      results,
      requeueCounts,
      elapsedSeconds,
      sessionXP,
    ],
  )

  const restartSession = useCallback(() => {
    if (!deck) return
    const due = deck.cards.filter((c) => isCardDue(c.dueDate))
    // If nothing is due, allow a full deck practice run so "Study Again" always works.
    const nextQueue = due.length > 0 ? due : deck.cards
    setQueue(nextQueue)
    setCurrentIndex(0)
    setFlipped(false)
    setResults([])
    setSessionXP(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setRequeueCounts({})
    setIsComplete(nextQueue.length === 0)
  }, [deck])

  const reviewMissedCards = useCallback(() => {
    if (!deck) return
    const missedIds = new Set(
      results
        .filter((r) => r.rating === 'again' || r.rating === 'hard')
        .map((r) => r.card.id),
    )
    const missedCards = deck.cards.filter((c) => missedIds.has(c.id))
    setQueue(missedCards)
    setCurrentIndex(0)
    setFlipped(false)
    setResults([])
    setSessionXP(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setRequeueCounts({})
    setIsComplete(missedCards.length === 0)
  }, [deck, results])

  const addCardToDeck = useCallback(
    (front: string, back: string) => {
      if (!deckId) return
      const card = addCard(deckId, front, back)
      setQueue((prev) => [...prev, card])
    },
    [addCard, deckId],
  )

  const progress =
    queue.length > 0 ? Math.round(((currentIndex) / queue.length) * 100) : 0

  const ratingCounts = results.reduce(
    (acc, r) => {
      acc[r.rating] = (acc[r.rating] ?? 0) + 1
      return acc
    },
    {} as Partial<Record<ConfidenceRating, number>>,
  )

  return {
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
    ratingCounts,
    progress,
    restartSession,
    totalXpAfter: totalXp,
    elapsedSeconds,
    isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    togglePause: () => setIsPaused((p) => !p),
    addCardToDeck,
    reviewMissedCards,
  }
}
