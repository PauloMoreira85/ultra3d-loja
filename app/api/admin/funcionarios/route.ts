import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabaseServer'
import { isDono } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

// GET → lista funcionários (sem o hash)
export async function GET(req: Request) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { data, error } = await service.from('funcionarios').select('id, nome, papel, ativo, created_at').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ funcionarios: data ?? [] })
}

// POST { nome, pin, papel } → cria funcionário
export async function POST(req: Request) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  let body: { nome?: string; pin?: string; papel?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const nome = (body.nome || '').trim()
  const pin = (body.pin || '').trim()
  if (nome.length < 2) return NextResponse.json({ error: 'nome muito curto' }, { status: 422 })
  if (!/^\d{4,6}$/.test(pin)) return NextResponse.json({ error: 'PIN deve ter 4 a 6 dígitos' }, { status: 422 })
  const papel = body.papel === 'dono' ? 'dono' : 'funcionario'

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const pin_hash = await bcrypt.hash(pin, 10)
  const { error } = await service.from('funcionarios').insert({ nome, pin_hash, papel })
  if (error) {
    const dup = error.code === '23505' || /duplicate|unique/i.test(error.message)
    return NextResponse.json({ error: dup ? 'já existe um funcionário com esse nome' : error.message }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json({ ok: true })
}
