'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardResponse } from '@/types/leaderboard'

const fallback: LeaderboardResponse = { totalUsd: 0, verifiedPayments: 0, entries: [] }

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse>(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        const response = await fetch('/api/leaderboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Leaderboard request failed')
        const json = await response.json()
        if (alive) setData(json)
      } catch {
        // Keep empty state visible when Supabase is not configured yet.
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    const timer = window.setInterval(fetchData, 12000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  return { data, loading }
}
