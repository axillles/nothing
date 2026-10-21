import { GoldButton } from './Button'
import { LiveCounter } from './LiveCounter'
import { NothingDust } from './NothingDust'

export function Hero() {
  return (
    <section className="relative mx-auto max-w-[980px] px-5 pb-16 pt-28 text-center sm:pt-36">
      <div className="absolute inset-x-0 top-0 h-[640px] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
        <NothingDust />
      </div>
      <div className="relative">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--gold)]">A completely unnecessary financial experience</p>
        <h1 className="hero-title font-serif text-[clamp(52px,12vw,118px)] leading-[0.91] tracking-[-0.04em]">PAY FOR<br />NOTHING.</h1>
        <p className="mx-auto mt-7 max-w-[530px] text-base leading-7 text-[#9c9c9c] sm:text-lg">No product. No subscription. No utility. No roadmap.<br />Just a payment.</p>
        <p className="mt-2 text-sm text-[#666]">You already know what this is.</p>
        <GoldButton href="#tiers" className="mt-9">PAY FOR NOTHING →</GoldButton>
        <div className="mt-7 text-xs tracking-[0.22em] text-[#555]">BTC · ETH · SOL · USDC · USDT</div>
        <LiveCounter />
      </div>
    </section>
  )
}
