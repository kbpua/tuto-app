// ─── XP & Level System ────────────────────────────────────────────────────────

import type { ConfidenceRating } from './sm2'

export const XP_PER_LEVEL = 500

/** Raw XP awarded per confidence rating (before streak multiplier). */
export const BASE_XP: Record<ConfidenceRating, number> = {
  again: 2,
  hard: 5,
  good: 10,
  easy: 15,
}

/** Streak-based XP multiplier — rewards consistency. */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0
  if (streak >= 14) return 1.75
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.25
  return 1.0
}

/** Final XP to award for a single card review, streak-adjusted. */
export function computeXP(rating: ConfidenceRating, streak: number): number {
  return Math.round(BASE_XP[rating] * streakMultiplier(streak))
}

/**
 * Returns level info derived from total accumulated XP.
 * Each level requires XP_PER_LEVEL (500) XP.
 */
export function getLevelInfo(totalXp: number) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const xpIntoLevel = totalXp % XP_PER_LEVEL
  return { level, current: xpIntoLevel, max: XP_PER_LEVEL }
}
