'use client'

import { useEffect, useState } from 'react'
import { PaymentModal } from '@/components/PaymentModal'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import type { Currency } from '@/types/payment'
import Link from 'next/link'

export default function PayPage() {
  const [currency, setCurrency] = useState<Currency>('SOL')
  const [amount, setAmount] = useState('69')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    const queryAmount = url.searchParams.get('amount')
    if (queryAmount && Number(queryAmount) > 0) setAmount(queryAmount)
  }, [])
  const amountNumber = Math.max(1, Number(amount) || 1)
  return (
    <main className="mx-auto min-h-screen max-w-[900px] px-5 py-12 sm:py-20">
      <Link href="/" className="font-mono text-xs tracking-[0.18em] text-[#555] hover:text-white">← NOTHING.</Link>
      <div className="mx-auto mt-16 max-w-2xl text-center">
        <div className="font-mono text-xs tracking-[0.25em] text-[var(--gold)]">PAYMENT TERMINAL</div>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">HOW DO YOU<br />WANT TO WASTE<br />YOUR MONEY?</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[#777]">Choose a currency. The backend chooses the verification path. The browser never tells the server that a payment succeeded.</p>
      </div>
      <div className="mx-auto mt-12 max-w-xl rounded-[4px] border border-[var(--line)] bg-[var(--card)] p-6 sm:p-8">
        <CurrencyPicker value={currency} onChange={setCurrency} />
        <label className="mt-7 block font-mono text-xs text-[#666]">USD AMOUNT</label>
        <div className="mt-2 flex items-center border-b border-[var(--line)]"><span className="font-mono text-2xl text-[#555]">$</span><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="w-full bg-transparent px-2 py-3 font-mono text-3xl outline-none" /></div>
        <button onClick={() => setOpen(true)} className="mt-7 w-full rounded-[2px] bg-[var(--gold)] px-6 py-4 font-mono text-sm font-bold text-[var(--bg)]">PAY ${amountNumber.toLocaleString('en-US', { maximumFractionDigits: 2 })} WITH {currency}</button>
        <div className="mt-4 font-mono text-[10px] leading-5 text-[#555]">Network: Solana-native for SOL/USDC. Gateway-confirmed for BTC/ETH/USDT.</div>
      </div>
      {open && <PaymentModal amountUsd={amountNumber} initialCurrency={currency} onClose={() => setOpen(false)} />}
    </main>
  )
}
