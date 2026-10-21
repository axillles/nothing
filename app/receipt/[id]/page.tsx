import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { ReceiptStudio } from '@/components/ReceiptStudio'
import { receiptCardData, siteLabel } from '@/lib/receipt/generate'
import { parseReceiptOptions, receiptQuery } from '@/lib/receipt/themes'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

// Only verified payments have a receipt; an unpaid intent id must not render as "verified".
const loadPayment = cache(async (id: string) => {
  const { data } = await getAdminSupabase().from('payments').select('*').eq('id', id).in('status', ['verified', 'minted']).maybeSingle()
  return data
})

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params
  const payment = await loadPayment(id)
  if (!payment) return {}
  const options = parseReceiptOptions(await searchParams)
  const title = `Receipt #${String(payment.sequence_number).padStart(5, '0')} · $${Number(payment.amount_usd).toFixed(2)} for nothing`
  const image = `/api/receipts/${id}/image?${receiptQuery(options)}`
  return {
    title,
    description: 'Someone voluntarily paid for nothing. This is the proof.',
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  }
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const { id } = await params
  const payment = await loadPayment(id)
  if (!payment) notFound()
  const options = parseReceiptOptions(await searchParams)
  return (
    <main className="mx-auto min-h-screen max-w-[1040px] px-5 py-12 sm:py-16">
      <Link href="/" className="font-mono text-xs tracking-[0.18em] text-[#555] hover:text-white">← NOTHING.</Link>
      <div className="mt-10 text-center">
        <div className="font-mono text-xs tracking-[0.25em] text-[var(--green)]">PAYMENT VERIFIED.</div>
        <h1 className="mt-3 font-serif text-4xl sm:text-6xl">Your receipt for nothing</h1>
        <p className="mt-3 text-sm text-[#777]">Style it, download it, post it. Prove to everyone that you own nothing.</p>
      </div>
      <div className="mt-10">
        <ReceiptStudio paymentId={payment.id} data={receiptCardData(payment)} initial={options} site={siteLabel()} />
      </div>
      <p className="mt-10 text-center font-mono text-[11px] leading-5 text-[#555]">This receipt records a verified payment. It does not represent a product, investment, utility or promise of future value.</p>
    </main>
  )
}
