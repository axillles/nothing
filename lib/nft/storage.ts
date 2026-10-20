import { getEnv } from '@/lib/env'

export async function uploadJsonToIpfs(payload: object) {
  const env = getEnv()
  if (!env.STORAGE_API_URL || !env.STORAGE_API_KEY) throw new Error('NFT storage is not configured')
  const response = await fetch(`${env.STORAGE_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.STORAGE_API_KEY}`,
    },
    body: JSON.stringify({ pinataContent: payload }),
  })
  if (!response.ok) throw new Error(`IPFS upload failed: ${response.status}`)
  const data = await response.json() as { IpfsHash?: string }
  if (!data.IpfsHash) throw new Error('IPFS provider returned no CID')
  const gateway = env.STORAGE_GATEWAY_URL ?? 'https://gateway.pinata.cloud/ipfs'
  return `${gateway}/${data.IpfsHash}`
}
