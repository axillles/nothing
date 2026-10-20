import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import Big from 'big.js'

// Solana Memo v2 program. Memo requires every account passed to it to sign,
// so the memo carries only text; the reference rides on the transfer itself.
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

// Same convention as Solana Pay wallets: the unique reference is appended as a
// read-only, non-signer key on the transfer instruction, which lets the backend
// find the transaction with getSignaturesForAddress(reference).
function withReference(instruction: TransactionInstruction, reference: PublicKey) {
  instruction.keys.push({ pubkey: reference, isSigner: false, isWritable: false })
  return instruction
}

export function buildSolanaPaymentTransaction(args: {
  payer: PublicKey
  treasury: PublicKey
  reference: PublicKey
  amountCrypto: string
  currency: 'SOL' | 'USDC'
  usdcMint?: PublicKey
}) {
  const amount = new Big(args.amountCrypto)
  if (amount.lte(0)) throw new Error('Payment amount must be positive')

  const transaction = new Transaction()

  if (args.currency === 'SOL') {
    const lamports = amount.times(1_000_000_000)
    if (!lamports.round(0).eq(lamports)) throw new Error('SOL amount has too many decimals')
    transaction.add(withReference(
      SystemProgram.transfer({
        fromPubkey: args.payer,
        toPubkey: args.treasury,
        lamports: lamports.toNumber(),
      }),
      args.reference,
    ))
  } else {
    if (!args.usdcMint) throw new Error('USDC mint is required')
    const source = getAssociatedTokenAddressSync(args.usdcMint, args.payer, false)
    const destination = getAssociatedTokenAddressSync(args.usdcMint, args.treasury, false)
    const baseUnits = amount.times(1_000_000)
    if (!baseUnits.round(0).eq(baseUnits)) throw new Error('USDC amount has too many decimals')
    transaction.add(
      // The treasury's USDC account may not exist yet; creating it is a no-op if it does.
      createAssociatedTokenAccountIdempotentInstruction(args.payer, destination, args.treasury, args.usdcMint),
      withReference(
        createTransferCheckedInstruction(
          source,
          args.usdcMint,
          destination,
          args.payer,
          baseUnits.toNumber(),
          6,
        ),
        args.reference,
      ),
    )
  }

  transaction.add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(`NOTHING:${args.reference.toBase58()}`),
    }),
  )

  return transaction
}

export function buildSolanaPayUrl(args: {
  recipient: PublicKey
  reference: PublicKey
  amountCrypto: string
  currency: 'SOL' | 'USDC'
  usdcMint?: PublicKey
  label?: string
  message?: string
}) {
  const params = new URLSearchParams({
    amount: args.amountCrypto,
    reference: args.reference.toBase58(),
  })
  if (args.currency === 'USDC') {
    if (!args.usdcMint) throw new Error('USDC mint is required')
    params.set('spl-token', args.usdcMint.toBase58())
  }
  if (args.label) params.set('label', args.label)
  if (args.message) params.set('message', args.message)
  return `solana:${args.recipient.toBase58()}?${params.toString()}`
}
