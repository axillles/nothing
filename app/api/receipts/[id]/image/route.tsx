import { getAdminSupabase } from '@/lib/supabase/admin'
import { receiptImage } from '@/lib/receipt/generate'

export const runtime = 'edge'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getAdminSupabase()
  const { data: payment, error } = await supabase.from('payments').select('*').eq('id', id).in('status', ['verified', 'minted']).maybeSingle()
  if (error || !payment) return new Response('Not found', { status: 404 })
  return receiptImage(payment)
}
