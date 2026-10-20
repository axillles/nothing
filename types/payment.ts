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
  chain: Chain
  currency: Currency
  provider: string
  amountUsd: number
  expectedAmountCrypto: string
  reference?: string
  treasuryAddress?: string
  usdcMint?: string
  paymentAddress?: string
  paymentUrl?: string
  qrCode?: string
  expiresAt?: string
}
