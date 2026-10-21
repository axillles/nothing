import Big from 'big.js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Payment, PaymentStatus } from '@/types/payment'
import type { GatewayWebhookEvent } from './types'

// NOWPayments statuses: waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired.
const PAID = new Set(['confirmed', 'sending', 'finished'])
const TERMINAL: Record<string, PaymentStatus> = { failed: 'failed', refunded: 'failed', expired: 'expired' }
// Allow for rounding between the quoted and the observed amount.
const AMOUNT_TOLERANCE = 0.995

export type ApplyResult = { status: PaymentStatus; providerStatus: string; changed: boolean; reason?: string }

/**
 * Applies a gateway event (signed webhook or pulled status) to a stored payment.
 * The browser never reaches this path with its own data.
 */
export async function applyGatewayEvent(payment: Payment, event: GatewayWebhookEvent): Promise<ApplyResult> {
  const providerStatus = event.status.toLowerCase()
  const unchanged = (reason?: string): ApplyResult => ({ status: payment.status, providerStatus, changed: false, reason })

  if (payment.status === 'verified' || payment.status === 'minted') return unchanged('already verified')
  if (event.providerPaymentId !== payment.provider_payment_id) return unchanged('provider payment id mismatch')
  if (event.currency !== payment.currency) return unchanged('currency mismatch')

  const supabase = getAdminSupabase()

  const terminal = TERMINAL[providerStatus]
  if (terminal) {
    await supabase.from('payments').update({ status: terminal }).eq('id', payment.id).in('status', ['created', 'pending'])
    return { status: terminal, providerStatus, changed: true }
  }
  if (!PAID.has(providerStatus)) return unchanged()

  const received = new Big(event.amountCrypto || 0)
  const expected = new Big(payment.amount_crypto ?? 0)
  if (received.lt(expected.times(AMOUNT_TOLERANCE))) return unchanged('underpaid')

  const { data: updated, error } = await supabase.from('payments').update({
    status: 'verified',
    amount_crypto: received.toString(),
    confirmed_at: new Date().toISOString(),
  }).eq('id', payment.id).not('status', 'in', '(verified,minted)').select('id').maybeSingle()
  if (error) throw error
  if (updated) await supabase.from('payment_events').insert({ payment_id: payment.id, event_type: 'verified', payload: event.raw })
  return { status: 'verified', providerStatus, changed: Boolean(updated) }
}
