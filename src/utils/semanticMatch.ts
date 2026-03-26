function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Stubbed semantic checker.
 * For now this accepts exact matches and "near" matches by token overlap.
 * Later this can be replaced with a real AI semantic API call.
 */
export function checkSemanticMatch(userAnswer: string, correctAnswer: string): boolean {
  const user = normalize(userAnswer)
  const correct = normalize(correctAnswer)

  if (!user || !correct) return false
  if (user === correct) return true
  if (correct.includes(user) || user.includes(correct)) return true

  const userTokens = new Set(user.split(' '))
  const correctTokens = correct.split(' ')
  const overlap = correctTokens.filter((t) => userTokens.has(t)).length
  const overlapRatio = overlap / Math.max(correctTokens.length, 1)

  return overlapRatio >= 0.7
}

