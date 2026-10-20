import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

type LeaderboardRow = { payer_address: string | null; amount_usd: number | string | null; payments_count: number | string | null; last_payment_at: string | null }

export async function GET() {
  const supabase = getAdminSupabase()
  const [{ data: entries, error: entriesError }, { data: stats, error: statsError }] = await Promise.all([
    supabase.from('leaderboard').select('*').order('amount_usd', { ascending: false }).limit(50),
    supabase.from('leaderboard_stats').select('*').single(),
  ])
  if (entriesError || statsError) return NextResponse.json({ error: entriesError?.message ?? statsError?.message }, { status: 500 })
  return NextResponse.json({
    totalUsd: Number(stats?.total_usd ?? 0),
    verifiedPayments: Number(stats?.verified_payments ?? 0),
    entries: (entries ?? []).map((entry: LeaderboardRow, index: number) => ({
      payerAddress: entry.payer_address,
      amountUsd: Number(entry.amount_usd ?? 0),
      paymentsCount: Number(entry.payments_count ?? 0),
      lastPaymentAt: entry.last_payment_at,
      rank: index + 1,
    })),
  })
}
