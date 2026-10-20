import { cryptoFromUsd, decimalsFor, getUsdRate } from '@/lib/pricing/usdRate'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'

export class MockGatewayAdapter implements GatewayAdapter {
  async createPayment(params: GatewayCreateParams): Promise<GatewayPayment> {
    const providerPaymentId = `mock_${params.paymentId}`
    return {
      providerPaymentId,
      paymentAddress: `mock-address-${params.currency.toLowerCase()}`,
      paymentUrl: `${params.callbackUrl}?mock=1&paymentId=${params.paymentId}`,
      qrPayload: `nothing:${params.currency}:${params.amountUsd}:${params.paymentId}`,
      amountCrypto: cryptoFromUsd(params.amountUsd, await getUsdRate(params.currency), decimalsFor(params.currency)),
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const body = await request.json() as Record<string, unknown>
    return {
      providerPaymentId: String(body.providerPaymentId ?? body.payment_id ?? ''),
      currency: String(body.currency ?? 'BTC').toUpperCase() as GatewayWebhookEvent['currency'],
      amountCrypto: String(body.amountCrypto ?? body.amount ?? '0'),
      status: String(body.status ?? 'confirmed'),
      payerAddress: typeof body.payerAddress === 'string' ? body.payerAddress : null,
      raw: body,
    }
  }
}
