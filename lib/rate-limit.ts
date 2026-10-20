import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | undefined
let disabledByConfig = false

function isConfiguredValue(value: string | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 && !normalized.includes('your-redis') && !normalized.includes('replace_me')
}

function getRateLimit() {
  if (ratelimit) return ratelimit
  if (disabledByConfig) return null

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  // Local development can run without Upstash. Do not try to contact a placeholder host.
  if (!isConfiguredValue(url) || !isConfiguredValue(token)) {
    disabledByConfig = true
    return null
  }

  const redis = new Redis({ url: url!.trim(), token: token!.trim() })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'nothing-api',
  })
  return ratelimit
}

export async function enforceRateLimit(key: string) {
  const limiter = getRateLimit()
  if (!limiter) return { success: true, remaining: 999, limit: 10, reset: Date.now() + 60_000 }

  try {
    return await limiter.limit(key)
  } catch (error) {
    // Never let a transient Redis/DNS outage block the payment API in local/dev mode.
    // In production, enable FAIL_CLOSED_RATE_LIMIT=true to reject requests instead.
    console.error('[rate-limit] Upstash request failed:', error)
    if (process.env.FAIL_CLOSED_RATE_LIMIT === 'true') {
      return { success: false, remaining: 0, limit: 10, reset: Date.now() + 60_000 }
    }
    return { success: true, remaining: 999, limit: 10, reset: Date.now() + 60_000 }
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
