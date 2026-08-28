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

// PATCH { ativo?, pin?, papel? } → ativa/desativa, troca PIN ou papel
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { id } = await ctx.params
  let body: { ativo?: boolean; pin?: string; papel?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (typeof body.ativo === 'boolean') patch.ativo = body.ativo
  if (body.papel) patch.papel = body.papel === 'dono' ? 'dono' : 'funcionario'
  if (body.pin) {
    if (!/^\d{4,6}$/.test(body.pin)) return NextResponse.json({ error: 'PIN deve ter 4 a 6 dígitos' }, { status: 422 })
    patch.pin_hash = await bcrypt.hash(body.pin, 10)
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nada a atualizar' }, { status: 422 })

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('funcionarios').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE → remove funcionário
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { id } = await ctx.params
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('funcionarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
