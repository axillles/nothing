'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardResponse } from '@/types/leaderboard'

const fallback: LeaderboardResponse = { totalUsd: 0, verifiedPayments: 0, entries: [] }
const POLL_MS = 12000

// One poller shared by every component on the page (counter, wall, leaderboard).
let current: LeaderboardResponse = fallback
let loaded = false
let timer: number | undefined
const listeners = new Set<() => void>()

async function refresh() {
  try {
    const response = await fetch('/api/leaderboard', { cache: 'no-store' })
    if (!response.ok) throw new Error('Leaderboard request failed')
    current = await response.json()
  } catch {
    // Keep the last known state; the next tick retries.
  } finally {
    loaded = true
    listeners.forEach((listener) => listener())
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    void refresh()
    timer = window.setInterval(refresh, POLL_MS)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.clearInterval(timer)
  }
}

export function useLeaderboard() {
  const [state, setState] = useState({ data: current, loading: !loaded })
  useEffect(() => subscribe(() => setState({ data: current, loading: false })), [])
  return state
}
