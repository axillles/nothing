import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { mintReceipt } from '@/lib/nft/mint'

export async function POST(request: Request) { return run(request) }
export async function GET(request: Request) { return run(request) }

async function run(request: Request) {
  // Vercel Cron sends `Bearer ${CRON_SECRET}`; MINT_JOB_SECRET is accepted for manual triggers.
  const secrets = [process.env.CRON_SECRET, process.env.MINT_JOB_SECRET].filter(Boolean)
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!auth || !secrets.includes(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getAdminSupabase()
  const { data: payments, error } = await supabase.from('payments').select('*').eq('status', 'verified').is('mint_id', null).order('confirmed_at', { ascending: true }).limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: unknown[] = []
  for (const payment of payments ?? []) {
    try {
      results.push({ id: payment.id, ...(await mintReceipt(payment)) })
    } catch (err) {
      console.error('mint failed', payment.id, err)
      await supabase.from('payment_events').insert({ payment_id: payment.id, event_type: 'nft_failed', payload: { error: err instanceof Error ? err.message : String(err) } })
      results.push({ id: payment.id, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return NextResponse.json({ processed: results.length, results })
}
