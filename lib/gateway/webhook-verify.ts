import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv } from '@/lib/env'

// Webhook payloads are provider-defined JSON; the adapter narrows fields with String()/typeof.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebhookPayload = Record<string, any>

// NOWPayments IPN: HMAC-SHA512 over JSON.stringify of the payload with keys sorted recursively.
export function nowPaymentsSignature(raw: string, secret: string) {
  return createHmac('sha512', secret).update(JSON.stringify(sortKeys(JSON.parse(raw)))).digest('hex')
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]))
  }
  return value
}

export async function verifyProviderWebhook(request: Request): Promise<WebhookPayload> {
  const env = getEnv()
  if (!env.GATEWAY_WEBHOOK_SECRET) throw new Error('Missing GATEWAY_WEBHOOK_SECRET')
  const raw = await request.text()
  const signature = (request.headers.get('x-nowpayments-sig') ?? '').toLowerCase()
  if (!signature) throw new Error('Missing webhook signature')
  const a = Buffer.from(nowPaymentsSignature(raw, env.GATEWAY_WEBHOOK_SECRET))
  const b = Buffer.from(signature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid webhook signature')
  return JSON.parse(raw) as WebhookPayload
}
