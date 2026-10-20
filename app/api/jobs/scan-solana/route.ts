import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { findAndVerifySolanaPayment } from '@/lib/solana/track'

export async function GET(request: Request) { return run(request) }
export async function POST(request: Request) { return run(request) }

async function run(request: Request) {
  // Vercel Cron sends `Bearer ${CRON_SECRET}`; MINT_JOB_SECRET is accepted for manual triggers.
  const secrets = [process.env.CRON_SECRET, process.env.MINT_JOB_SECRET].filter(Boolean)
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!auth || !secrets.includes(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getAdminSupabase()
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .eq('chain', 'solana')
    .in('status', ['created', 'pending', 'submitted', 'confirmed'])
    .not('reference', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const payment of payments ?? []) {
    try {
      results.push({ id: payment.id, ...(await findAndVerifySolanaPayment(payment)) })
    } catch (err) {
      console.error('solana scan failed', payment.id, err)
      results.push({ id: payment.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ scanned: results.length, results })
}
