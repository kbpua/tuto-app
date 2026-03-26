type RateLimitConfig = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetInMs: number
}

const hitsByKey = new Map<string, number[]>()

function nowMs(): number {
  return Date.now()
}

export function applyRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = nowMs()
  const cutoff = now - config.windowMs
  const existing = hitsByKey.get(config.key) ?? []
  const recent = existing.filter((ts) => ts > cutoff)

  if (recent.length >= config.limit) {
    const oldest = recent[0] ?? now
    const resetInMs = Math.max(config.windowMs - (now - oldest), 1000)
    hitsByKey.set(config.key, recent)
    return {
      allowed: false,
      remaining: 0,
      resetInMs,
    }
  }

  recent.push(now)
  hitsByKey.set(config.key, recent)
  return {
    allowed: true,
    remaining: Math.max(config.limit - recent.length, 0),
    resetInMs: config.windowMs,
  }
}

export function getClientKey(req: { headers?: Record<string, string | string[] | undefined> }, routeName: string): string {
  const xff = req.headers?.['x-forwarded-for']
  const forwarded = Array.isArray(xff) ? xff[0] : xff
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `${routeName}:${ip}`
}

