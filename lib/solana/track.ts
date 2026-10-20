import { PublicKey } from '@solana/web3.js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getSolanaConnection } from './connection'
import { verifySolanaPayment } from './verify'
import type { Payment } from '@/types/payment'

export type SolanaTrackingResult = {
  status: Payment['status']
  transactionSignature: string | null
  sequenceNumber: number
  message?: string
}

/**
 * Find a Solana transaction by the unique Solana Pay reference account and
 * verify it server-side. This is what makes QR/mobile payments trackable
 * without requiring the payer to keep the desktop wallet session open.
 */
export async function findAndVerifySolanaPayment(payment: Payment): Promise<SolanaTrackingResult> {
  const supabase = getAdminSupabase()
  if (payment.status === 'verified' || payment.status === 'minted') {
    return {
      status: payment.status,
      transactionSignature: payment.transaction_signature,
      sequenceNumber: payment.sequence_number,
    }
  }
  if (payment.chain !== 'solana' || !payment.reference) {
    return {
      status: payment.status,
      transactionSignature: payment.transaction_signature,
      sequenceNumber: payment.sequence_number,
      message: 'This payment has no Solana reference to monitor.',
    }
  }

  const reference = new PublicKey(payment.reference)
  const connection = getSolanaConnection()
  const signatures = await connection.getSignaturesForAddress(reference, { limit: 20 })

  for (const item of signatures) {
    if (item.err) continue
    try {
      const verified = await verifySolanaPayment({ ...payment, transaction_signature: item.signature })
      const confirmedAt = new Date().toISOString()
      const { data: updated, error } = await supabase
        .from('payments')
        .update({
          transaction_signature: item.signature,
          status: 'verified',
          amount_crypto: verified.observedAmount,
          payer_address: verified.payerAddress,
          confirmed_at: confirmedAt,
        })
        .eq('id', payment.id)
        .neq('status', 'verified')
        .select('status, transaction_signature')
        .maybeSingle()
      if (error) throw error

      if (updated) {
        await supabase.from('payment_events').insert({
          payment_id: payment.id,
          event_type: 'verified',
          payload: { signature: item.signature, source: 'solana_reference_scan' },
        })
      }

      return {
        status: updated?.status ?? 'verified',
        transactionSignature: updated?.transaction_signature ?? item.signature,
        sequenceNumber: payment.sequence_number,
      }
    } catch {
      // A reference can appear in an unrelated/failed transaction. Keep
      // scanning recent candidates until one passes all payment checks.
    }
  }

  return {
    status: payment.status,
    transactionSignature: payment.transaction_signature,
    sequenceNumber: payment.sequence_number,
    message: 'No matching finalized payment found yet.',
  }
}
