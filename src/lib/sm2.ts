// ─── SM-2 Spaced Repetition Algorithm ─────────────────────────────────────────
// Based on the original SuperMemo SM-2 algorithm.
// ref: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

export type ConfidenceRating = 'again' | 'hard' | 'good' | 'easy'

export type CardSM2 = {
  interval: number       // days until next review
  repetitions: number    // consecutive successful reviews
  easeFactor: number     // difficulty multiplier (min 1.3, default 2.5)
  dueDate: string | null // ISO date string — null = brand new card
}

export const DEFAULT_SM2: CardSM2 = {
  interval: 1,
  repetitions: 0,
  easeFactor: 2.5,
  dueDate: null,
}

// Maps UI button labels to SM-2 quality scores (0–5)
const QUALITY: Record<ConfidenceRating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
}

/**
 * Applies one SM-2 review cycle to a card and returns the updated SM-2 fields.
 */
export function applySM2(card: CardSM2, rating: ConfidenceRating): CardSM2 {
  const q = QUALITY[rating]
  let { interval, repetitions, easeFactor } = card

  if (q < 3) {
    // Incorrect — reset back to learning
    interval = 1
    repetitions = 0
  } else {
    // Correct — advance schedule
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  }

  // Update ease factor (clamped at 1.3 to prevent cards becoming too hard)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
  )

  const due = new Date()
  due.setDate(due.getDate() + interval)

  return { interval, repetitions, easeFactor, dueDate: due.toISOString() }
}

/** Returns true if a card is due for review right now. */
export function isCardDue(dueDate: string | null): boolean {
  if (dueDate === null) return true // new cards are always due
  return new Date(dueDate) <= new Date()
}

/** Human-readable next review label. */
export function nextReviewLabel(dueDate: string | null): string {
  if (!dueDate) return 'Due now'
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  if (diff <= 0) return 'Due now'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}
