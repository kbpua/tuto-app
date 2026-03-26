/// <reference types="node" />

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

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined
  const direct = headers[name]
  if (Array.isArray(direct)) return direct[0]
  if (typeof direct === 'string') return direct

  const lower = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) continue
    if (Array.isArray(value)) return value[0]
    return value
  }
  return undefined
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) return null

  try {
    const base64url = parts[1]
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
    const decoded = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function getUserSubject(headers: Record<string, string | string[] | undefined> | undefined): string | null {
  const authHeader = getHeaderValue(headers, 'authorization')
  if (!authHeader) return null

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) return null

  const payload = decodeJwtPayload(token)
  const sub = payload?.sub
  if (typeof sub !== 'string' || !sub) return null

  return `user:${sub}`
}

export function getClientKey(req: { headers?: Record<string, string | string[] | undefined> }, routeName: string): string {
  const userSubject = getUserSubject(req.headers)
  if (userSubject) {
    return `${routeName}:${userSubject}`
  }

  const xff = req.headers?.['x-forwarded-for']
  const forwarded = Array.isArray(xff) ? xff[0] : xff
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `${routeName}:ip:${ip}`
}

