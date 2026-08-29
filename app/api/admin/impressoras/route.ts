import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff, isDono } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

// GET → lista impressoras (qualquer staff usa no dia a dia)
export async function GET(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { data, error } = await service.from('impressoras').select('*').order('ordem')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ impressoras: data ?? [] })
}

// POST { nome, tipo } → cria (só dono)
export async function POST(req: Request) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  let body: { nome?: string; tipo?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const nome = (body.nome || '').trim()
  if (nome.length < 2) return NextResponse.json({ error: 'nome muito curto' }, { status: 422 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('impressoras').insert({ nome, tipo: body.tipo || null, ordem: 99 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
