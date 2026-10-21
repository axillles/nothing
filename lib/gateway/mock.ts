import { cryptoFromUsd, decimalsFor, getUsdRate } from '@/lib/pricing/usdRate'
import type { Currency } from '@/types/payment'
import type { GatewayAdapter, GatewayCreateParams, GatewayPayment, GatewayWebhookEvent } from './types'

// Local-only stand-in for the gateway. Confirm a payment by POSTing
// { providerPaymentId, currency, amountCrypto, status: "finished" } to /api/webhooks/gateway.
export class MockGatewayAdapter implements GatewayAdapter {
  async createPayment(params: GatewayCreateParams): Promise<GatewayPayment> {
    return {
      providerPaymentId: `mock_${params.paymentId}`,
      paymentAddress: `mock-address-${params.currency.toLowerCase()}-${params.paymentId.slice(0, 8)}`,
      amountCrypto: cryptoFromUsd(params.amountUsd, await getUsdRate(params.currency), decimalsFor(params.currency)),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }
  }

  async verifyWebhook(request: Request): Promise<GatewayWebhookEvent> {
    const body = await request.json() as Record<string, unknown>
    return {
      providerPaymentId: String(body.providerPaymentId ?? body.payment_id ?? ''),
      currency: String(body.currency ?? 'BTC').toUpperCase() as Currency,
      amountCrypto: String(body.amountCrypto ?? body.amount ?? '0'),
      status: String(body.status ?? 'finished'),
      raw: body,
    }
  }

  async getStatus(): Promise<GatewayWebhookEvent | null> {
    return null
  }

  async minimumUsd(): Promise<number | null> {
    return null
  }
}
