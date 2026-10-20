import bs58 from 'bs58'
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { getEnv } from '@/lib/env'
import { uploadJsonToIpfs } from './storage'
import type { Payment } from '@/types/payment'
import { getAdminSupabase } from '@/lib/supabase/admin'

export async function mintReceipt(payment: Payment) {
  const env = getEnv()
  if (!env.NFT_AUTHORITY_PRIVATE_KEY) throw new Error('NFT mint authority is not configured')
  if (!env.NEXT_PUBLIC_APP_URL) throw new Error('App URL is not configured')

  const image = `${env.NEXT_PUBLIC_APP_URL}/api/receipts/${payment.id}/image`
  const metadataUri = await uploadJsonToIpfs({
    name: `Nothing Receipt #${String(payment.sequence_number).padStart(5, '0')}`,
    description: 'Proof that someone voluntarily paid for nothing.',
    image,
    attributes: [
      { trait_type: 'Payment Network', value: payment.chain === 'bitcoin' ? 'Bitcoin' : payment.chain === 'ethereum' ? 'Ethereum' : 'Solana' },
      { trait_type: 'Currency', value: payment.currency },
      { trait_type: 'Amount', value: `${payment.amount_crypto ?? '0'} ${payment.currency}` },
      { trait_type: 'USD Value', value: `$${payment.amount_usd.toFixed(2)}` },
      { trait_type: 'Receipt', value: String(payment.sequence_number) },
    ],
  })

  const umi = createUmi(env.SOLANA_RPC_URL).use(mplTokenMetadata())
  const secret = bs58.decode(env.NFT_AUTHORITY_PRIVATE_KEY)
  umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(secret)))
  const mint = generateSigner(umi)
  const builder = createNft(umi, {
    mint,
    name: `Nothing Receipt #${String(payment.sequence_number).padStart(5, '0')}`,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
  })
  const result = await builder.sendAndConfirm(umi)
  const mintAddress = mint.publicKey.toString()

  const supabase = getAdminSupabase()
  const { data: nftMint, error } = await supabase.from('nft_mints').insert({
    payment_id: payment.id,
    mint_address: mintAddress,
    collection_address: env.NFT_COLLECTION_ADDRESS ?? null,
    metadata_uri: metadataUri,
    minted_at: new Date().toISOString(),
    status: 'minted',
  }).select('id').single()
  if (error) throw error
  const { error: paymentError } = await supabase.from('payments').update({ status: 'minted', mint_id: nftMint.id, confirmed_at: payment.confirmed_at ?? new Date().toISOString() }).eq('id', payment.id)
  if (paymentError) throw paymentError
  return { mintAddress, metadataUri, signature: result.signature.toString() }
}
