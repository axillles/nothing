'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Hero } from '@/components/Hero'
import { GoldButton } from '@/components/Button'
import { PaymentModal } from '@/components/PaymentModal'
import { NameYourPrice } from '@/components/NameYourPrice'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import type { Currency } from '@/types/payment'

const tiers = [
  { tag: 'THE MISTAKE', price: 1, text: 'You now own exactly the same amount of nothing as someone who paid $100,000.', items: ['Nothing', 'A transaction', 'Mild regret'] },
  { tag: 'NICE', price: 69, text: "Honestly, this is probably the most reasonable thing you've done today.", items: ['Nothing', 'A digital receipt', 'Bragging rights nobody asked for'] },
  { tag: 'DEGEN', price: 420, text: "Please don't explain this to your accountant.", items: ['Nothing', 'Numbered proof of nothing', 'A permanent place on the wall'] },
  { tag: 'WHALE', price: 10000, text: 'At this price, you could have bought something. You chose nothing. Respect.', items: ['Nothing', 'Premium receipt', 'Wallet immortalized on the wall'] },
]

export default function HomePage() {
  const [paying, setPaying] = useState<{ amountUsd: number; currency?: Currency } | null>(null)
  return (
    <main>
      <Hero />

      <section id="tiers" className="mx-auto max-w-[980px] px-5 py-16 sm:py-24">
        <h2 className="mb-11 text-center font-mono text-[13px] tracking-[0.3em] text-[var(--gold)]">CHOOSE YOUR NOTHING</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <article key={tier.tag} className="group rounded-[4px] border border-[var(--line)] bg-[var(--card)] p-7 transition-colors hover:border-[var(--gold)]">
              <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--purple)]">{tier.tag}</div>
              <div className="mt-2 text-4xl font-bold tracking-tight">${tier.price.toLocaleString('en-US')}</div>
              <p className="mt-3 max-w-[420px] text-sm leading-6 text-[#999]">{tier.text}</p>
              <ul className="mt-4 space-y-1 font-mono text-xs text-[#666]">{tier.items.map((item) => <li key={item}>· {item}</li>)}</ul>
              <button onClick={() => setPaying({ amountUsd: tier.price })} className="mt-6 w-full rounded-[2px] border border-[var(--gold)] px-4 py-3 font-mono text-xs text-[var(--gold)] transition hover:bg-[var(--gold)] hover:text-[var(--bg)]">{tier.price === 10000 ? 'BECOME A WHALE' : `PAY $${tier.price.toLocaleString('en-US')}`}</button>
            </article>
          ))}
        </div>
      </section>

      <section id="custom" className="mx-auto max-w-[680px] px-5 pb-16 sm:pb-24">
        <h2 className="mb-3 text-center font-mono text-[13px] tracking-[0.3em] text-[var(--gold)]">OR NAME YOUR PRICE</h2>
        <p className="mb-9 text-center text-sm text-[#777]">Tiers are for people who need structure. Pick any amount of nothing.</p>
        <NameYourPrice onPay={(amountUsd, currency) => setPaying({ amountUsd, currency })} />
      </section>

      <Wall />

      <section className="mx-auto max-w-[980px] px-5 py-16 sm:py-24">
        <h2 className="mb-11 text-center font-mono text-[13px] tracking-[0.3em] text-[var(--gold)]">FAQ</h2>
        {[
          ['Is this a scam?', "No. A scam involves deception about what you're buying. We're explicitly telling you: you are buying nothing. No product, service, investment, or return."],
          ['What do I get?', 'Nothing. You receive a public payment record and a numbered receipt.'],
          ['Is this an investment?', 'No. The project makes no promise of profit, appreciation, resale value, yield, or return.'],
          ['Why would anyone pay?', 'We have no idea. The premise is intentionally pointless; the system is designed to prove only that a payment happened.'],
        ].map(([q, a]) => <div key={q} className="border-b border-[var(--line)] py-5"><div className="text-base font-bold">{q}</div><div className="mt-2 max-w-3xl text-sm leading-6 text-[#999]">{a}</div></div>)}
      </section>

      <section className="mx-auto max-w-[980px] border-t border-[var(--line)] px-5 py-24 text-center">
        <h2 className="font-serif text-3xl sm:text-5xl">You&apos;ve scrolled this far.<br />You already know what happens next.</h2>
        <GoldButton href="#tiers" className="mt-8">PAY FOR NOTHING</GoldButton>
        <div className="mt-5 font-mono text-[11px] tracking-[0.1em] text-[#555]">NO ACCOUNT REQUIRED · NO SUBSCRIPTION · NO UTILITY · NO REFUNDS</div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-16 text-center text-sm text-[#444]">
        <div className="font-serif text-xl text-[var(--ivory)]">NOTHING™</div>
        <div className="mt-2">A completely unnecessary financial experience.</div>
        <div className="mt-4 font-mono text-xs tracking-[0.1em]"><Link href="/leaderboard" className="hover:text-white">LEADERBOARD</Link> · <a href={process.env.NEXT_PUBLIC_X_URL || '#'} className="hover:text-white">X</a> · <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL || '#'} className="hover:text-white">TELEGRAM</a></div>
      </footer>

      {paying && <PaymentModal amountUsd={paying.amountUsd} initialCurrency={paying.currency} onClose={() => setPaying(null)} />}
    </main>
  )
}

function Wall() {
  const { data } = useLeaderboard()
  return (
    <section className="mx-auto max-w-[980px] px-5 py-16 sm:py-24">
      <h2 className="mb-11 text-center font-mono text-[13px] tracking-[0.3em] text-[var(--gold)]">THE WALL OF NOTHING</h2>
      {data.entries.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.entries.slice(0, 4).map((entry) => <div key={`${entry.rank}-${entry.payerAddress}`} className="border border-[var(--line)] bg-[var(--card)] p-4 font-mono"><div className="text-xs text-[#666]">{entry.payerAddress ? `${entry.payerAddress.slice(0, 5)}...${entry.payerAddress.slice(-4)}` : 'anonymous'}</div><div className="my-1 text-xl font-bold text-[var(--green)]">${entry.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div><div className="text-[10px] tracking-[0.08em] text-[#555]">{entry.rank === 1 ? 'TOP NOTHING HOLDER' : 'FOR NOTHING'}</div></div>)}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--line)] p-8 text-center font-mono text-xs text-[#555]">THE WALL IS EMPTY · ONLY VERIFIED PAYMENTS APPEAR HERE</div>
      )}
    </section>
  )
}
