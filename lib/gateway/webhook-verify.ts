import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv } from '@/lib/env'

// Webhook payloads are provider-defined JSON; adapters narrow fields with String()/typeof.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebhookPayload = Record<string, any>

type SignatureScheme = (raw: string, secret: string) => string

// Coinbase Commerce / generic: HMAC-SHA256 over the raw request body.
const rawSha256: SignatureScheme = (raw, secret) => createHmac('sha256', secret).update(raw).digest('hex')

// NOWPayments IPN: HMAC-SHA512 over JSON.stringify of the payload with keys sorted recursively.
const sortedJsonSha512: SignatureScheme = (raw, secret) => createHmac('sha512', secret).update(JSON.stringify(sortKeys(JSON.parse(raw)))).digest('hex')

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]))
  }
  return value
}

async function readAndVerify(request: Request, headerName: string, scheme: SignatureScheme): Promise<WebhookPayload> {
  const env = getEnv()
  if (!env.GATEWAY_WEBHOOK_SECRET) throw new Error('Missing GATEWAY_WEBHOOK_SECRET')
  const raw = await request.text()
  const signature = (request.headers.get(headerName) ?? request.headers.get('x-signature') ?? '').toLowerCase()
  if (!signature) throw new Error('Missing webhook signature')
  const expected = scheme(raw, env.GATEWAY_WEBHOOK_SECRET)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid webhook signature')
  return JSON.parse(raw) as WebhookPayload
}

export function verifyProviderWebhook(request: Request) { return readAndVerify(request, 'x-nowpayments-sig', sortedJsonSha512) }
export function verifyCoinbaseWebhook(request: Request) { return readAndVerify(request, 'x-cc-webhook-signature', rawSha256) }
export function verifyBitpayWebhook(request: Request) { return readAndVerify(request, 'x-signature', rawSha256) }
