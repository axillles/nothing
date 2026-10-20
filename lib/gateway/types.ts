import type { Currency } from '@/types/payment'

export interface GatewayCreateParams {
  paymentId: string
  sequenceNumber: number
  amountUsd: number
  currency: Exclude<Currency, 'SOL' | 'USDC'>
  callbackUrl: string
}

export interface GatewayPayment {
  providerPaymentId: string
  paymentAddress: string
  paymentUrl?: string
  qrPayload?: string
  amountCrypto: string
  expiresAt?: string
  raw?: unknown
}

export interface GatewayWebhookEvent {
  providerPaymentId: string
  currency: Exclude<Currency, 'SOL' | 'USDC'>
  amountCrypto: string
  status: string
  payerAddress?: string | null
  raw: unknown
}

export interface GatewayAdapter {
  createPayment(params: GatewayCreateParams): Promise<GatewayPayment>
  verifyWebhook(request: Request): Promise<GatewayWebhookEvent>
}
