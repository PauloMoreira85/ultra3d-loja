import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAMPOS = new Set([
  'status', 'forma_pagamento', 'frete', 'observacoes', 'frete_rastreio',
  'cliente_nome', 'cliente_telefone', 'cliente_email', 'cliente_cpf',
  'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
])

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado: defina SUPABASE_SERVICE_ROLE_KEY no Vercel.' } }
}

// PATCH /api/admin/pedidos/:id  → atualiza status / campos
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) if (CAMPOS.has(k)) patch[k] = v
  if (patch.status === 'pago') patch.pago_em = new Date().toISOString()
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nada a atualizar' }, { status: 422 })

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('pedidos').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/pedidos/:id  → apaga (cascade nos itens)
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('pedidos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
