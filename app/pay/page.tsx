'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PaymentModal } from '@/components/PaymentModal'
import { NameYourPrice } from '@/components/NameYourPrice'
import type { Currency } from '@/types/payment'

export default function PayPage() {
  const [initialAmount, setInitialAmount] = useState<number | null>(null)
  const [paying, setPaying] = useState<{ amountUsd: number; currency: Currency } | null>(null)

  useEffect(() => {
    const queryAmount = Number(new URL(window.location.href).searchParams.get('amount'))
    setInitialAmount(Number.isFinite(queryAmount) && queryAmount > 0 ? queryAmount : 69)
  }, [])

  return (
    <main className="mx-auto min-h-screen max-w-[900px] px-5 py-12 sm:py-20">
      <Link href="/" className="font-mono text-xs tracking-[0.18em] text-[#555] hover:text-white">← NOTHING.</Link>
      <div className="mx-auto mt-16 max-w-2xl text-center">
        <div className="font-mono text-xs tracking-[0.25em] text-[var(--gold)]">PAYMENT TERMINAL</div>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">HOW MUCH<br />NOTHING<br />DO YOU WANT?</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[#777]">Type any amount, drag the slider or tap a preset. Each payment gets its own address and confirms on its own.</p>
      </div>
      <div className="mx-auto mt-12 max-w-xl">
        {initialAmount !== null && <NameYourPrice initialAmount={initialAmount} onPay={(amountUsd, currency) => setPaying({ amountUsd, currency })} />}
      </div>
      {paying && <PaymentModal amountUsd={paying.amountUsd} initialCurrency={paying.currency} onClose={() => setPaying(null)} />}
    </main>
  )
}
