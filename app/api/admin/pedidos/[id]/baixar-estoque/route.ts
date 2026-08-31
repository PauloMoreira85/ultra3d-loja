import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Consumo = { estoque_id: string; quantidade: number }

// POST → dá baixa no estoque com base no consumo dos itens (idempotente)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Banco não configurado.' }, { status: 503 }) }

  const { data: pedido } = await service.from('pedidos').select('estoque_baixado').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'pedido não encontrado' }, { status: 404 })
  if (pedido.estoque_baixado) return NextResponse.json({ error: 'estoque já foi baixado deste pedido' }, { status: 409 })

  const { data: itens } = await service.from('itens_pedido').select('quantidade, consumo').eq('pedido_id', id)
  // soma o consumo total por insumo (consumo × quantidade do item)
  const total = new Map<string, number>()
  for (const it of (itens ?? []) as { quantidade: number; consumo: Consumo[] }[]) {
    for (const c of it.consumo ?? []) {
      if (!c.estoque_id) continue
      total.set(c.estoque_id, (total.get(c.estoque_id) ?? 0) + Number(c.quantidade) * Number(it.quantidade))
    }
  }
  if (!total.size) return NextResponse.json({ error: 'nenhum item deste pedido tem consumo de estoque definido' }, { status: 422 })

  const baixados: { nome: string; usou: number; restou: number }[] = []
  for (const [eid, qtd] of total) {
    const { data: ins } = await service.from('estoque').select('nome, quantidade').eq('id', eid).single()
    if (!ins) continue
    const restou = Number(ins.quantidade) - qtd
    await service.from('estoque').update({ quantidade: restou, updated_at: new Date().toISOString() }).eq('id', eid)
    baixados.push({ nome: ins.nome, usou: qtd, restou })
  }
  await service.from('pedidos').update({ estoque_baixado: true }).eq('id', id)
  return NextResponse.json({ ok: true, baixados })
}
