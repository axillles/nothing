import { getEnv } from '@/lib/env'
import type { Currency } from '@/types/payment'
import { GATEWAY_CURRENCIES, currencyFromTicker } from './currencies'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'
import type { WebhookPayload } from './webhook-verify'

const MINIMUM_CACHE_MS = 10 * 60 * 1000
// Prices move between quote and payment; keep a margin above the provider's floor.
const MINIMUM_SAFETY_MARGIN = 1.05
const minimumCache = new Map<Currency, { value: number; at: number }>()

export class NowPaymentsAdapter implements GatewayAdapter {
  private get baseUrl() {
    return getEnv().GATEWAY_API_URL ?? 'https://api.nowpayments.io'
  }

  private get headers() {
    const key = getEnv().GATEWAY_API_KEY
    if (!key) throw new Error('GATEWAY_API_KEY is required')
    return { 'Content-Type': 'application/json', 'x-api-key': key }
  }

  async createPayment(params: GatewayCreateParams): Promise<GatewayPayment> {
    // NOWPayments cannot reach localhost; in that case status is pulled via getStatus instead.
    const publicCallback = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(params.callbackUrl)
    const response = await fetch(`${this.baseUrl}/v1/payment`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        price_amount: params.amountUsd,
        price_currency: 'usd',
        pay_currency: GATEWAY_CURRENCIES[params.currency].ticker,
        ...(publicCallback ? { ipn_callback_url: params.callbackUrl } : {}),
        order_id: params.paymentId,
        order_description: `NOTHING receipt #${String(params.sequenceNumber).padStart(5, '0')}`,
      }),
    })
    const json = await response.json().catch(() => ({})) as WebhookPayload
    if (!response.ok) throw new Error(`Gateway create failed: ${json.message ?? response.status}`)
    if (typeof json.pay_address !== 'string' || !json.pay_address) throw new Error('Gateway returned no payment address')
    return {
      providerPaymentId: String(json.payment_id),
      paymentAddress: json.pay_address,
      amountCrypto: String(json.pay_amount),
      expiresAt: typeof json.expiration_estimate_date === 'string' ? json.expiration_estimate_date : undefined,
      raw: json,
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const { verifyProviderWebhook } = await import('./webhook-verify')
    return toEvent(await verifyProviderWebhook(request))
  }

  async getStatus(providerPaymentId: string): Promise<GatewayWebhookEvent | null> {
    const response = await fetch(`${this.baseUrl}/v1/payment/${encodeURIComponent(providerPaymentId)}`, { headers: this.headers, cache: 'no-store' })
    if (!response.ok) return null
    return toEvent(await response.json() as WebhookPayload)
  }

  async minimumUsd(currency: Currency): Promise<number | null> {
    const cached = minimumCache.get(currency)
    if (cached && Date.now() - cached.at < MINIMUM_CACHE_MS) return cached.value
    const ticker = GATEWAY_CURRENCIES[currency].ticker
    const response = await fetch(`${this.baseUrl}/v1/min-amount?currency_from=${ticker}&fiat_equivalent=usd`, { headers: this.headers, cache: 'no-store' })
    if (!response.ok) return null
    const json = await response.json() as { fiat_equivalent?: number }
    if (typeof json.fiat_equivalent !== 'number' || !Number.isFinite(json.fiat_equivalent)) return null
    const value = Math.ceil(json.fiat_equivalent * MINIMUM_SAFETY_MARGIN)
    minimumCache.set(currency, { value, at: Date.now() })
    return value
  }
}

function toEvent(payload: WebhookPayload): GatewayWebhookEvent {
  // actually_paid is what arrived; pay_amount is what was requested.
  const paid = payload.actually_paid ?? payload.pay_amount ?? '0'
  return {
    providerPaymentId: String(payload.payment_id ?? ''),
    currency: currencyFromTicker(String(payload.pay_currency ?? '')),
    amountCrypto: String(paid),
    status: String(payload.payment_status ?? ''),
    raw: payload,
  }
}
