import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { gerarCobrancaPedido, type FormaCobranca } from '@/lib/asaas/cobranca'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const dig = (s: string) => (s || '').replace(/\D/g, '')

type ItemIn = { produto_id: string; quantidade: number }
type Body = {
  itens: ItemIn[]
  cliente: { nome: string; email?: string; telefone?: string; cpf: string }
  endereco?: { cep?: string; rua?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string }
  frete?: { servico?: string; servico_id?: number; transportadora?: string; preco?: number; prazo?: number; retirada?: boolean }
  forma: FormaCobranca
}

export async function POST(req: Request) {
  let b: Body
  try { b = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!b.itens?.length) return NextResponse.json({ error: 'carrinho vazio' }, { status: 422 })
  if (dig(b.cliente?.cpf).length !== 11 && dig(b.cliente?.cpf).length !== 14) return NextResponse.json({ error: 'CPF inválido' }, { status: 422 })
  if (!b.cliente?.nome) return NextResponse.json({ error: 'informe seu nome' }, { status: 422 })
  if (!['pix', 'boleto', 'cartao'].includes(b.forma)) return NextResponse.json({ error: 'forma de pagamento inválida' }, { status: 422 })
  const retirada = !!b.frete?.retirada
  if (!retirada && dig(b.endereco?.cep || '').length !== 8) return NextResponse.json({ error: 'informe o endereço de entrega' }, { status: 422 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'loja indisponível no momento' }, { status: 503 }) }

  // valida produtos + preços NO BANCO (não confia no cliente)
  const ids = [...new Set(b.itens.map(i => i.produto_id))]
  const { data: prods } = await service.from('produtos').select('id, nome, preco, ativo').in('id', ids)
  const mapa = new Map((prods ?? []).map(p => [p.id, p]))
  const linhas = b.itens.map(i => {
    const p = mapa.get(i.produto_id)
    if (!p || !p.ativo) return null
    const q = Math.max(1, Math.floor(Number(i.quantidade) || 1))
    return { produto_id: p.id, descricao: p.nome, quantidade: q, preco_unitario: Number(p.preco), valor_total: Number(p.preco) * q }
  }).filter(Boolean) as { produto_id: string; descricao: string; quantidade: number; preco_unitario: number; valor_total: number }[]
  if (!linhas.length) return NextResponse.json({ error: 'produtos indisponíveis' }, { status: 422 })

  const subtotal = linhas.reduce((s, l) => s + l.valor_total, 0)
  const frete = retirada ? 0 : Number(b.frete?.preco || 0)
  const total = subtotal + frete
  const en = b.endereco ?? {}

  const { data: ped, error } = await service.from('pedidos').insert({
    origem: 'site', status: 'aguardando_pagamento', forma_pagamento: b.forma,
    subtotal, frete, total,
    cliente_nome: b.cliente.nome, cliente_telefone: b.cliente.telefone || null,
    cliente_email: b.cliente.email || null, cliente_cpf: dig(b.cliente.cpf),
    cep: retirada ? null : dig(en.cep || ''), rua: en.rua || null, numero: en.numero || null,
    complemento: en.complemento || null, bairro: en.bairro || null, cidade: en.cidade || null, uf: en.uf || null,
    frete_servico: retirada ? 'Retirada em Maringá' : (b.frete?.servico || null),
    frete_servico_id: b.frete?.servico_id || null, frete_prazo_dias: b.frete?.prazo || null,
    frete_transportadora: retirada ? null : (b.frete?.transportadora || null),
    observacoes: retirada ? 'Retirada em Maringá' : null,
  }).select('id, codigo').single()
  if (error || !ped) return NextResponse.json({ error: 'falha ao criar pedido' }, { status: 500 })

  await service.from('itens_pedido').insert(linhas.map(l => ({ ...l, pedido_id: ped.id })))

  try {
    const cob = await gerarCobrancaPedido(service, ped.id, b.forma)
    return NextResponse.json({ ok: true, pedidoId: ped.id, codigo: ped.codigo, cobranca: cob })
  } catch (e) {
    // pedido criado, cobrança falhou — cliente ainda pode acompanhar/retomar
    return NextResponse.json({ ok: true, pedidoId: ped.id, codigo: ped.codigo, cobranca: null, aviso: e instanceof Error ? e.message : 'cobrança pendente' })
  }
}
