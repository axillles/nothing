export interface NftMint {
  id: string
  payment_id: string
  mint_address: string | null
  collection_address: string | null
  metadata_uri: string | null
  minted_at: string | null
  status: 'queued' | 'minted' | 'failed'
}
