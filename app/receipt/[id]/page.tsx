import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { ReceiptCard } from '@/components/ReceiptCard'

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: payment } = await getAdminSupabase().from('payments').select('*').eq('id', id).single()
  if (!payment) notFound()
  return (
    <main className="mx-auto min-h-screen max-w-[860px] px-5 py-12 sm:py-20">
      <Link href="/" className="font-mono text-xs tracking-[0.18em] text-[#555] hover:text-white">← NOTHING.</Link>
      <div className="mx-auto mt-16 max-w-2xl">
        <ReceiptCard payment={payment} />
        <p className="mt-6 text-center font-mono text-[11px] leading-5 text-[#555]">This receipt records a verified payment. It does not represent a product, investment, utility or promise of future value.</p>
      </div>
    </main>
  )
}
