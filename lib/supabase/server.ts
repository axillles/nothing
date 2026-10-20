import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

export function getServerSupabase() {
  const env = getEnv()
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
