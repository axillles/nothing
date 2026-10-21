'use client'

import type { Currency } from '@/types/payment'

export function CurrencyPicker({ value, onChange }: { value: Currency; onChange: (value: Currency) => void }) {
  const currencies: Currency[] = ['SOL', 'USDC', 'BTC', 'ETH', 'USDT']
  return (
    <div className="grid grid-cols-5 gap-2">
      {currencies.map((currency) => (
        <button key={currency} onClick={() => onChange(currency)} className={`rounded-[2px] border px-1 py-3 font-mono text-[11px] tracking-normal transition-colors sm:px-2 sm:text-xs sm:tracking-[0.08em] ${value === currency ? 'border-[var(--gold)] bg-[#16120a] text-[var(--gold)]' : 'border-[var(--line)] bg-[#0d0d0d] text-[#777] hover:border-[#333] hover:text-[var(--ivory)]'}`}>
          {currency}
        </button>
      ))}
    </div>
  )
}
