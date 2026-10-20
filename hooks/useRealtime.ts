'use client'

import { useEffect } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/browser'

export function useRealtime(onChange: () => void) {
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getBrowserSupabase>['channel']> | null = null
    try {
      const supabase = getBrowserSupabase()
      channel = supabase.channel('payments-live').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange).subscribe()
    } catch {
      channel = null
    }
    return () => { if (channel) void getBrowserSupabase().removeChannel(channel) }
  }, [onChange])
}
