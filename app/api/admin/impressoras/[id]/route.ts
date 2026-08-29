import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isDono } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { id } = await ctx.params
  let body: { nome?: string; tipo?: string; ativo?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const patch: Record<string, unknown> = {}
  if (body.nome) patch.nome = body.nome.trim()
  if (body.tipo !== undefined) patch.tipo = body.tipo
  if (typeof body.ativo === 'boolean') patch.ativo = body.ativo
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nada a atualizar' }, { status: 422 })
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('impressoras').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { id } = await ctx.params
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('impressoras').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
