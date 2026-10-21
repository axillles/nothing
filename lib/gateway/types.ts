import type { Currency } from '@/types/payment'

export interface GatewayCreateParams {
  paymentId: string
  sequenceNumber: number
  amountUsd: number
  currency: Currency
  callbackUrl: string
}

export interface GatewayPayment {
  providerPaymentId: string
  paymentAddress: string
  amountCrypto: string
  expiresAt?: string
  raw?: unknown
}

export interface GatewayWebhookEvent {
  providerPaymentId: string
  /** null when the provider reports a currency we did not offer. */
  currency: Currency | null
  /** Amount the payer actually sent, in crypto units. */
  amountCrypto: string
  status: string
  raw: unknown
}

export interface GatewayAdapter {
  createPayment(params: GatewayCreateParams): Promise<GatewayPayment>
  verifyWebhook(request: Request): Promise<GatewayWebhookEvent>
  /** Pull the provider's current view of a payment; used when a webhook is late or unreachable. */
  getStatus(providerPaymentId: string): Promise<GatewayWebhookEvent | null>
  /** Smallest USD amount the provider accepts for this currency, or null if unknown. */
  minimumUsd(currency: Currency): Promise<number | null>
}
