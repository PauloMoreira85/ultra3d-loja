import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/pedido/:id → dados públicos p/ o cliente acompanhar (id uuid = token de acesso)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'indisponível' }, { status: 503 }) }

  const { data: p } = await service.from('pedidos').select(
    'codigo, status, total, subtotal, frete, forma_pagamento, cliente_nome, frete_servico, frete_rastreio, ' +
    'asaas_invoice_url, asaas_boleto_url, asaas_linha_digitavel, asaas_pix_qrcode_base64, asaas_pix_copia_cola'
  ).eq('id', id).single()
  if (!p) return NextResponse.json({ error: 'pedido não encontrado' }, { status: 404 })

  const { data: itens } = await service.from('itens_pedido').select('descricao, quantidade, valor_total').eq('pedido_id', id)
  return NextResponse.json({ pedido: p, itens: itens ?? [] })
}
