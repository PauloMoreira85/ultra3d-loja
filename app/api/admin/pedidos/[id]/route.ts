import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff, isDono } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAMPOS = new Set([
  'status', 'forma_pagamento', 'frete', 'desconto', 'observacoes', 'frete_rastreio', 'impressora', 'imagens',
  'cliente_nome', 'cliente_telefone', 'cliente_email', 'cliente_cpf',
  'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
])

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado: defina SUPABASE_SERVICE_ROLE_KEY no Vercel.' } }
}

// PATCH /api/admin/pedidos/:id  → atualiza status / campos
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) if (CAMPOS.has(k)) patch[k] = v
  if (patch.status === 'pago') patch.pago_em = new Date().toISOString()

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })

  // edição de itens/frete/desconto: substitui e recalcula subtotal/total
  type ItemIn = { produto_id?: string | null; descricao: string; quantidade: number; preco_unitario: number; consumo?: unknown[] }
  const itens = Array.isArray(body.itens) ? (body.itens as ItemIn[]) : null
  const mexeValor = itens || patch.frete != null || patch.desconto != null
  if (mexeValor) {
    const { data: atual } = await service.from('pedidos').select('subtotal, frete, desconto').eq('id', id).single()
    const subtotal = itens ? itens.reduce((s, i) => s + Number(i.preco_unitario) * Number(i.quantidade), 0) : Number(atual?.subtotal ?? 0)
    const frete = patch.frete != null ? Number(patch.frete) : Number(atual?.frete ?? 0)
    const desconto = patch.desconto != null ? Number(patch.desconto) : Number(atual?.desconto ?? 0)
    if (itens) patch.subtotal = subtotal
    patch.total = Math.max(0, subtotal + frete - desconto)
    if (itens) {
      await service.from('itens_pedido').delete().eq('pedido_id', id)
      await service.from('itens_pedido').insert(itens.map(i => ({
        pedido_id: id, produto_id: i.produto_id || null, descricao: i.descricao,
        quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario),
        valor_total: Number(i.preco_unitario) * Number(i.quantidade),
        consumo: Array.isArray(i.consumo) ? i.consumo : [],
      })))
    }
  }

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nada a atualizar' }, { status: 422 })
  const { error } = await service.from('pedidos').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/pedidos/:id  → apaga (cascade nos itens)
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono pode apagar' }, { status: 403 })
  const { id } = await ctx.params
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('pedidos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
