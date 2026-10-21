'use client'

import { useEffect, useState } from 'react'
import type { Currency } from '@/types/payment'

type Minimums = Partial<Record<Currency, number>>

let cached: Promise<Minimums> | null = null

function loadMinimums() {
  cached ??= fetch('/api/payments/limits')
    .then((response) => (response.ok ? response.json() : { minimums: {} }))
    .then((data: { minimums?: Minimums }) => data.minimums ?? {})
    .catch(() => {
      cached = null
      return {}
    })
  return cached
}

/** USD minimum per currency (gateway floor plus our own minimum). */
export function usePaymentLimits() {
  const [minimums, setMinimums] = useState<Minimums>({})
  useEffect(() => {
    let alive = true
    loadMinimums().then((value) => { if (alive) setMinimums(value) })
    return () => { alive = false }
  }, [])
  return minimums
}
