import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado: defina SUPABASE_SERVICE_ROLE_KEY no Vercel.' } }
}

// GET /api/admin/pedidos?status=&origem=  → lista pedidos + itens
export async function GET(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const origem = searchParams.get('origem')

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  let q = service
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (status) q = q.eq('status', status)
  if (origem) q = q.eq('origem', origem)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pedidos: data ?? [] })
}

type ItemInput = { produto_id?: string | null; descricao: string; quantidade: number; preco_unitario: number }

// POST /api/admin/pedidos  → cria pedido MANUAL (venda direta / PDV)
export async function POST(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const itens = (body.itens as ItemInput[] | undefined) ?? []
  if (!itens.length) return NextResponse.json({ error: 'adicione ao menos 1 item' }, { status: 422 })

  const subtotal = itens.reduce((s, i) => s + Number(i.preco_unitario) * Number(i.quantidade), 0)
  const frete = Number(body.frete ?? 0)
  const total = subtotal + frete

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { data: ped, error } = await service.from('pedidos').insert({
    origem: 'manual',
    status: (body.status as string) || 'pago',
    forma_pagamento: (body.forma_pagamento as string) || 'dinheiro',
    subtotal, frete, total,
    cliente_nome: (body.cliente_nome as string) || 'Cliente balcão',
    impressora: (body.impressora as string) || null,
    cliente_telefone: (body.cliente_telefone as string) || null,
    cliente_email: (body.cliente_email as string) || null,
    cliente_cpf: (body.cliente_cpf as string) || null,
    cep: (body.cep as string) || null, rua: (body.rua as string) || null,
    numero: (body.numero as string) || null, complemento: (body.complemento as string) || null,
    bairro: (body.bairro as string) || null, cidade: (body.cidade as string) || null, uf: (body.uf as string) || null,
    observacoes: (body.observacoes as string) || null,
    pago_em: ((body.status as string) || 'pago') === 'pago' ? new Date().toISOString() : null,
  }).select('id').single()
  if (error || !ped) return NextResponse.json({ error: error?.message || 'falha ao criar' }, { status: 500 })

  const linhas = itens.map(i => ({
    pedido_id: ped.id,
    produto_id: i.produto_id || null,
    descricao: i.descricao,
    quantidade: Number(i.quantidade),
    preco_unitario: Number(i.preco_unitario),
    valor_total: Number(i.preco_unitario) * Number(i.quantidade),
  }))
  const { error: ie } = await service.from('itens_pedido').insert(linhas)
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: ped.id })
}
