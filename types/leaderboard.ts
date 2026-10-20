export interface LeaderboardEntry {
  payerAddress: string | null
  amountUsd: number
  paymentsCount: number
  lastPaymentAt: string
  rank: number
}

export interface LeaderboardResponse {
  totalUsd: number
  verifiedPayments: number
  entries: LeaderboardEntry[]
}
