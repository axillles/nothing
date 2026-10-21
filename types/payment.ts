export const CURRENCIES = ['SOL', 'USDC', 'BTC', 'ETH', 'USDT'] as const
export type Currency = typeof CURRENCIES[number]

export type PaymentStatus = 'created' | 'pending' | 'submitted' | 'confirmed' | 'verified' | 'minted' | 'failed' | 'expired'
export type Chain = 'solana' | 'bitcoin' | 'ethereum'

export interface Payment {
  id: string
  sequence_number: number
  chain: Chain
  currency: Currency
  provider: string
  payer_address: string | null
  amount_crypto: string | null
  amount_usd: number
  usd_rate: number
  price_timestamp: string
  reference: string | null
  transaction_signature: string | null
  provider_payment_id: string | null
  status: PaymentStatus
  created_at: string
  confirmed_at: string | null
  mint_id: string | null
}

export interface PaymentIntent {
  id: string
  sequenceNumber: number
  currency: Currency
  /** Network the payer must send on, e.g. "Solana (SPL)". */
  network: string
  amountUsd: number
  amountCrypto: string
  /** Unique deposit address issued by the gateway for this payment. */
  paymentAddress: string
  /** Wallet deep link / QR payload. */
  walletUri: string
  expiresAt?: string
}
