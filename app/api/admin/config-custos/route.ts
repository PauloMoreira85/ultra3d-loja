import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

const CAMPOS = new Set(['filamento_kg', 'energia_kwh', 'potencia_w', 'falha_pct', 'mao_obra_hora', 'markup'])

// GET → parâmetros de custo (qualquer staff pode ver p/ calcular)
export async function GET(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { data, error } = await service.from('config_custos').select('*').eq('id', 1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

// PATCH → salva parâmetros (staff pode calcular/ajustar)
export async function PATCH(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) if (CAMPOS.has(k)) patch[k] = Number(v)

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('config_custos').update(patch).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
