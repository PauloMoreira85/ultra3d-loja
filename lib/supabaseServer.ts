import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://feonykqatexoplqtpqla.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb255a3FhdGV4b3BscXRwcWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjE1MzUsImV4cCI6MjEwMzQ5NzUzNX0.L5RykORCBJjyjc6t3yEG2yoV2b6k1CpsBtmZaNHME1c'

/** Client com service role — ignora RLS. Só no servidor (webhook, rotas de API, PDV). */
export function createServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Client autenticado como o usuário (RLS aplica) a partir do token do request. */
export function createUserClient(accessToken: string): SupabaseClient {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ANON
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
