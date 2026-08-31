import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

// GET → lista insumos
export async function GET(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { data, error } = await service.from('estoque').select('*').order('categoria').order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ itens: data ?? [] })
}

const CAMPOS = ['nome', 'categoria', 'unidade', 'quantidade', 'minimo', 'custo_unit', 'obs', 'ativo']

// POST → cria insumo
export async function POST(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!(body.nome as string)?.trim()) return NextResponse.json({ error: 'informe o nome' }, { status: 422 })
  const row: Record<string, unknown> = {}
  for (const k of CAMPOS) if (body[k] !== undefined) row[k] = body[k]
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('estoque').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
