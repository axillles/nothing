import Link from 'next/link'
import { Leaderboard } from '@/components/Leaderboard'

export default function LeaderboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[980px] px-5 py-12 sm:py-20">
      <Link href="/" className="font-mono text-xs tracking-[0.18em] text-[#555] hover:text-white">← NOTHING.</Link>
      <div className="mx-auto mt-16 max-w-3xl text-center">
        <div className="font-mono text-xs tracking-[0.25em] text-[var(--gold)]">THE WALL</div>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">LEADERBOARD</h1>
        <p className="mt-4 text-sm leading-6 text-[#777]">Only verified payments are eligible. Pending, failed and expired intents never appear here.</p>
      </div>
      <div className="mt-12"><Leaderboard /></div>
    </main>
  )
}
