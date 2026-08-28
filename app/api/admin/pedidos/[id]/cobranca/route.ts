import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'
import { gerarCobrancaPedido, type FormaCobranca } from '@/lib/asaas/cobranca'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/pedidos/:id/cobranca  { forma: 'pix'|'boleto'|'cartao', cliente_cpf? }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: { forma?: FormaCobranca; cliente_cpf?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const forma = body.forma
  if (!forma || !['pix', 'boleto', 'cartao'].includes(forma)) return NextResponse.json({ error: 'forma inválida' }, { status: 422 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Banco/Asaas não configurado no Vercel.' }, { status: 503 }) }

  if (body.cliente_cpf) await service.from('pedidos').update({ cliente_cpf: body.cliente_cpf }).eq('id', id)

  try {
    const r = await gerarCobrancaPedido(service, id, forma)
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'falha na cobrança' }, { status: 502 })
  }
}
