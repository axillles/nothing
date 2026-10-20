import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

export function getAdminSupabase() {
  const env = getEnv()
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
