import type { WebhookPayload } from './webhook-verify'
import { getEnv } from '@/lib/env'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'

export class BitPayAdapter implements GatewayAdapter {
  private get baseUrl() { return getEnv().GATEWAY_API_URL ?? 'https://bitpay.com' }
  private get headers() {
    const key = getEnv().GATEWAY_API_KEY
    if (!key) throw new Error('GATEWAY_API_KEY is required')
    return { 'Content-Type': 'application/json', 'x-accept-version': '2.0.0', 'Authorization': `Bearer ${key}` }
  }

  async createPayment(params: GatewayCreateParams): Promise<GatewayPayment> {
    const response = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        price: params.amountUsd,
        currency: 'USD',
        orderId: params.paymentId,
        token: undefined,
        buyer: undefined,
        notificationURL: params.callbackUrl,
        redirectURL: `${getEnv().NEXT_PUBLIC_APP_URL}/pay`,
      }),
    })
    if (!response.ok) throw new Error(`BitPay create failed: ${response.status}`)
    const json = await response.json() as WebhookPayload
    const data = json.data ?? json
    return {
      providerPaymentId: String(data.invoiceId ?? data.id),
      paymentAddress: String(data.address ?? data.url ?? ''),
      paymentUrl: typeof data.url === 'string' ? data.url : undefined,
      qrPayload: String(data.address ?? data.url ?? ''),
      amountCrypto: String(data.cryptoInfo?.amount ?? params.amountUsd),
      expiresAt: typeof data.expirationTime === 'string' ? data.expirationTime : undefined,
      raw: json,
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const { verifyBitpayWebhook } = await import('./webhook-verify')
    const payload = await verifyBitpayWebhook(request)
    return {
      providerPaymentId: String(payload.invoiceId ?? payload.id ?? payload.orderId ?? ''),
      currency: String(payload.currency ?? 'BTC').toUpperCase() as GatewayWebhookEvent['currency'],
      amountCrypto: String(payload.amount ?? payload.cryptoAmount ?? '0'),
      status: String(payload.status ?? ''),
      payerAddress: null,
      raw: payload,
    }
  }
}
