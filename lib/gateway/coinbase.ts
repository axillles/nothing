import type { WebhookPayload } from './webhook-verify'
import { getEnv } from '@/lib/env'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'

export class CoinbaseCommerceAdapter implements GatewayAdapter {
  private get baseUrl() { return getEnv().GATEWAY_API_URL ?? 'https://api.commerce.coinbase.com' }
  private get headers() {
    const key = getEnv().GATEWAY_API_KEY
    if (!key) throw new Error('GATEWAY_API_KEY is required')
    return { 'Content-Type': 'application/json', 'X-CC-Api-Key': key, 'X-CC-Version': '2018-03-22' }
  }

  async createPayment(params: GatewayCreateParams): Promise<GatewayPayment> {
    const response = await fetch(`${this.baseUrl}/charges`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name: `NOTHING receipt #${String(params.sequenceNumber).padStart(5, '0')}`,
        description: 'Proof that someone voluntarily paid for nothing.',
        pricing_type: 'fixed_price',
        local_price: { amount: params.amountUsd.toFixed(2), currency: 'USD' },
        metadata: { payment_id: params.paymentId, currency: params.currency },
        redirect: { success_url: `${getEnv().NEXT_PUBLIC_APP_URL}/pay`, cancel_url: `${getEnv().NEXT_PUBLIC_APP_URL}/pay` },
      }),
    })
    if (!response.ok) throw new Error(`Coinbase Commerce create failed: ${response.status}`)
    const json = await response.json() as WebhookPayload
    const charge = json.data ?? json
    const address = String(charge.address ?? charge.hosted_url ?? '')
    return {
      providerPaymentId: String(charge.id),
      paymentAddress: address,
      paymentUrl: typeof charge.hosted_url === 'string' ? charge.hosted_url : undefined,
      qrPayload: typeof charge.address === 'string' ? charge.address : charge.hosted_url,
      amountCrypto: String(charge.pricing?.[params.currency.toLowerCase()]?.amount ?? params.amountUsd),
      raw: json,
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const { verifyCoinbaseWebhook } = await import('./webhook-verify')
    const payload = await verifyCoinbaseWebhook(request)
    const data = payload.event ?? payload
    return {
      providerPaymentId: String(data.data?.id ?? data.id ?? ''),
      currency: String(data.data?.pricing?.local?.currency ?? 'BTC').toUpperCase() as GatewayWebhookEvent['currency'],
      amountCrypto: String(data.data?.pricing?.crypto?.amount ?? data.data?.pricing?.[String(data.data?.currency ?? '').toLowerCase()]?.amount ?? '0'),
      status: String(data.event?.type ?? data.type ?? ''),
      payerAddress: null,
      raw: payload,
    }
  }
}
