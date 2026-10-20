import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getSolanaConnection } from './connection'
import { treasuryKey, usdcMintKey } from './constants'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Payment } from '@/types/payment'
import Big from 'big.js'

export async function verifySolanaPayment(payment: Payment) {
  if (!payment.reference) throw new Error('Payment has no Solana reference')
  if (!payment.transaction_signature) throw new Error('Missing transaction signature')

  const connection = getSolanaConnection()
  const signature = payment.transaction_signature
  const tx = await connection.getParsedTransaction(signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 })
  if (!tx || !tx.meta) throw new Error('Transaction not found or not finalized')
  if (tx.meta.err) throw new Error('Transaction failed on chain')

  const reference = new PublicKey(payment.reference)
  const recipient = treasuryKey()
  const currency = payment.currency
  let payerAddress: string | null = null
  let observedAmount = new Big(0)

  if (currency === 'SOL') {
    const pre = tx.meta.preBalances
    const post = tx.meta.postBalances
    const recipientIndex = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey.equals(recipient))
    if (recipientIndex < 0) throw new Error('Treasury is not a transaction account')
    const deltaLamports = post[recipientIndex] - pre[recipientIndex]
    if (deltaLamports <= 0) throw new Error('Treasury did not receive SOL')
    observedAmount = new Big(deltaLamports).div(LAMPORTS_PER_SOL)
    payerAddress = tx.transaction.message.accountKeys.find((key) => key.signer)?.pubkey.toBase58() ?? null
  } else if (currency === 'USDC') {
    const mint = usdcMintKey().toBase58()
    const post = tx.meta.postTokenBalances ?? []
    const pre = tx.meta.preTokenBalances ?? []
    const matchingPost = post.filter((b) => b.mint === mint && b.owner === recipient.toBase58())
    if (!matchingPost.length) throw new Error('Treasury USDC token account not found in transaction')
    for (const postBalance of matchingPost) {
      const before = pre.find((b) => b.accountIndex === postBalance.accountIndex)
      const after = Number(postBalance.uiTokenAmount.amount)
      const beforeAmount = before ? Number(before.uiTokenAmount.amount) : 0
      observedAmount = observedAmount.plus(new Big(after - beforeAmount).div(1_000_000))
    }
    payerAddress = tx.transaction.message.accountKeys.find((key) => key.signer)?.pubkey.toBase58() ?? null
  } else {
    throw new Error(`Unsupported Solana currency: ${currency}`)
  }

  const expected = new Big(payment.amount_crypto ?? 0)
  if (observedAmount.lt(expected)) throw new Error('Received amount is below expected amount')

  const hasReference = tx.transaction.message.accountKeys.some((key) => key.pubkey.equals(reference))
    || (tx.transaction.message.instructions ?? []).some((instruction) => JSON.stringify(instruction).includes(reference.toBase58()))
  if (!hasReference) throw new Error('Payment reference not found in transaction')

  const supabase = getAdminSupabase()
  const { data: existing } = await supabase.from('payments').select('id').eq('transaction_signature', signature).maybeSingle()
  if (existing && existing.id !== payment.id) throw new Error('Transaction signature has already been used')

  return { observedAmount: observedAmount.toString(), payerAddress }
}
