import { getEnv } from '@/lib/env'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'

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
    const response = await fetch(`${this.baseUrl}/v1/payment`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        price_amount: params.amountUsd,
        price_currency: 'usd',
        pay_currency: params.currency.toLowerCase(),
        ipn_callback_url: params.callbackUrl,
        order_id: params.paymentId,
        order_description: `NOTHING receipt #${String(params.sequenceNumber).padStart(5, '0')}`,
      }),
    })
    if (!response.ok) throw new Error(`Gateway create failed: ${response.status}`)
    const json = await response.json() as Record<string, unknown>
    return {
      providerPaymentId: String(json.payment_id ?? json.id),
      paymentAddress: String(json.pay_address),
      paymentUrl: typeof json.payment_url === 'string' ? json.payment_url : undefined,
      qrPayload: String(json.pay_address),
      amountCrypto: String(json.pay_amount ?? 0),
      expiresAt: typeof json.expiration_estimate_date === 'string' ? json.expiration_estimate_date : undefined,
      raw: json,
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const { verifyProviderWebhook } = await import('./webhook-verify')
    const payload = await verifyProviderWebhook(request)
    return {
      providerPaymentId: String(payload.payment_id ?? payload.id ?? ''),
      currency: String(payload.pay_currency ?? payload.currency ?? 'BTC').toUpperCase() as GatewayWebhookEvent['currency'],
      amountCrypto: String(payload.pay_amount ?? payload.amount ?? '0'),
      status: String(payload.payment_status ?? payload.status ?? ''),
      payerAddress: typeof payload.pay_address === 'string' ? payload.pay_address : null,
      raw: payload,
    }
  }
}
