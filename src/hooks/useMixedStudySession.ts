import { useEffect, useMemo, useState } from 'react'
import type { Card } from '../store/useDecksStore'

export type MixedQuestionType = 'flashcard' | 'multiple-choice' | 'fill-in-blank'

type MixedItem = {
  card: Card
  type: MixedQuestionType
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function randomType(): MixedQuestionType {
  const r = Math.random()
  if (r < 0.34) return 'flashcard'
  if (r < 0.67) return 'multiple-choice'
  return 'fill-in-blank'
}

export function useMixedStudySession(cards: Card[]) {
  const [items, setItems] = useState<MixedItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { correct: boolean; type: MixedQuestionType }>>({})

  useEffect(() => {
    const nextItems = shuffle(cards).map((card) => ({ card, type: randomType() }))
    setItems(nextItems)
    setCurrentIndex(0)
    setAnswers({})
  }, [cards])

  const currentItem = items[currentIndex] ?? null

  const submitAnswer = (answer: boolean) => {
    if (!currentItem) return
    setAnswers((prev) => ({
      ...prev,
      [currentItem.card.id]: { correct: answer, type: currentItem.type },
    }))
  }

  const next = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)))
  }

  const sessionStats = useMemo(() => {
    const total = items.length
    const answeredEntries = Object.entries(answers)
    const correct = answeredEntries.filter(([, v]) => v.correct).length
    const incorrect = answeredEntries.length - correct
    const byType = {
      flashcard: answeredEntries.filter(([, v]) => v.type === 'flashcard').length,
      multipleChoice: answeredEntries.filter(([, v]) => v.type === 'multiple-choice').length,
      fillInBlank: answeredEntries.filter(([, v]) => v.type === 'fill-in-blank').length,
    }
    const missedCardIds = answeredEntries.filter(([, v]) => !v.correct).map(([id]) => id)
    return {
      total,
      answered: answeredEntries.length,
      correct,
      incorrect,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      byType,
      missedCardIds,
      isComplete: total > 0 && currentIndex >= total - 1 && answeredEntries.length >= total,
    }
  }, [answers, currentIndex, items.length])

  return {
    currentCard: currentItem?.card ?? null,
    currentType: currentItem?.type ?? null,
    currentIndex,
    total: items.length,
    submitAnswer,
    next,
    sessionStats,
    restart: () => {
      const nextItems = shuffle(cards).map((card) => ({ card, type: randomType() }))
      setItems(nextItems)
      setCurrentIndex(0)
      setAnswers({})
    },
    setCardsForReview: (reviewCards: Card[]) => {
      const reviewItems = shuffle(reviewCards).map((card) => ({ card, type: randomType() }))
      setItems(reviewItems)
      setCurrentIndex(0)
      setAnswers({})
    },
  }
}

