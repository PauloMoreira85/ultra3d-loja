import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adicionarAoCarrinho, checkoutCarrinho, gerarEtiquetas, imprimirEtiquetas, buscarShipment } from './client'
import { ORIGEM } from './origem'
import { cotarFrete } from './cotacao'

const dig = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

export interface ResultadoEtiqueta { etiqueta_url: string; rastreio: string | null; me_order_id: string }

/** Gera (ou reaproveita) a etiqueta Melhor Envio de um pedido pago. Requer saldo na conta ME. */
export async function gerarEtiquetaPedido(service: SupabaseClient, pedidoId: string): Promise<ResultadoEtiqueta> {
  const { data: p, error } = await service.from('pedidos').select('*').eq('id', pedidoId).single()
  if (error || !p) throw new Error('Pedido não encontrado')
  // já 100% pronto: reaproveita
  if (p.frete_etiqueta_url && p.melhorenvio_order_id) {
    return { etiqueta_url: p.frete_etiqueta_url, rastreio: p.frete_rastreio, me_order_id: p.melhorenvio_order_id }
  }
  // reserva já paga no ME mas sem PDF: NÃO reserva/cobra de novo — só gera/imprime a existente
  if (p.melhorenvio_order_id) {
    return await finalizarEtiqueta(service, pedidoId, p.melhorenvio_order_id, p.status, p.frete_rastreio)
  }
  if (!dig(p.cep)) throw new Error('Pedido sem CEP de entrega')

  const { data: itens } = await service.from('itens_pedido').select('*, produtos(peso_g, comprimento_cm, largura_cm, altura_cm)').eq('pedido_id', pedidoId)
  type L = { quantidade: number; preco_unitario: number; produtos: { peso_g: number; comprimento_cm: number; largura_cm: number; altura_cm: number } | null }
  const linhas = (itens ?? []) as unknown as L[]

  const remetente = {
    name: ORIGEM.nome, phone: dig(ORIGEM.telefone), email: ORIGEM.email || undefined,
    document: dig(ORIGEM.cnpj).length === 11 ? dig(ORIGEM.cnpj) : undefined,
    company_document: dig(ORIGEM.cnpj).length === 14 ? dig(ORIGEM.cnpj) : undefined,
    address: ORIGEM.rua, number: ORIGEM.numero, complement: ORIGEM.complemento || undefined,
    district: ORIGEM.bairro, city: ORIGEM.cidade, state_abbr: ORIGEM.uf, postal_code: dig(ORIGEM.cep), country_id: 'BR',
  }
  const destinatario = {
    name: p.cliente_nome || 'Cliente', phone: dig(p.cliente_telefone), email: p.cliente_email || undefined,
    document: dig(p.cliente_cpf).length === 11 ? dig(p.cliente_cpf) : undefined,
    company_document: dig(p.cliente_cpf).length === 14 ? dig(p.cliente_cpf) : undefined,
    address: p.rua, number: p.numero, complement: p.complemento || undefined,
    district: p.bairro, city: p.cidade, state_abbr: p.uf, postal_code: dig(p.cep), country_id: 'BR',
  }
  const volumes = linhas.map(l => ({
    width: Math.max(l.produtos?.largura_cm ?? 11, 11), height: Math.max(l.produtos?.altura_cm ?? 2, 2),
    length: Math.max(l.produtos?.comprimento_cm ?? 16, 16), weight: Math.max((l.produtos?.peso_g ?? 300) / 1000 * l.quantidade, 0.3),
  }))
  const valorSeg = Math.max(10, Number(p.subtotal))

  // usa o serviço escolhido na cotação; se falhar, re-cota e tenta o mais barato
  let cartId: string | null = null
  const base = {
    from: remetente, to: destinatario,
    products: [{ name: `Pedido #${p.codigo}`, quantity: linhas.reduce((a, l) => a + l.quantidade, 0), unitary_value: valorSeg }],
    volumes,
    options: { insurance_value: valorSeg, receipt: false, own_hand: false, reverse: false, non_commercial: true, platform: 'Ultra 3D Brasil' },
  }
  const tentar = async (service_id: number) => {
    try { const c = await adicionarAoCarrinho({ ...base, service: service_id }); cartId = c.id; return true } catch { return false }
  }
  if (p.frete_servico_id) await tentar(p.frete_servico_id)
  if (!cartId) {
    const ops = await cotarFrete(p.cep, linhas.map(l => ({
      peso_g: l.produtos?.peso_g ?? 300, comprimento_cm: l.produtos?.comprimento_cm ?? 16,
      largura_cm: l.produtos?.largura_cm ?? 11, altura_cm: l.produtos?.altura_cm ?? 2,
      quantidade: l.quantidade, valor: l.preco_unitario,
    })))
    for (const o of ops) if (await tentar(o.id)) break
  }
  if (!cartId) throw new Error('Nenhuma transportadora aceitou o envio')

  await checkoutCarrinho([cartId])
  await service.from('pedidos').update({ melhorenvio_order_id: cartId }).eq('id', pedidoId)

  return await finalizarEtiqueta(service, pedidoId, cartId, p.status, p.frete_rastreio)
}

/** Gera + imprime a etiqueta de uma reserva JÁ paga (idempotente). Não reserva nem cobra. */
async function finalizarEtiqueta(
  service: SupabaseClient, pedidoId: string, orderId: string,
  statusAtual: string, rastreioAtual: string | null,
): Promise<ResultadoEtiqueta> {
  try { await gerarEtiquetas([orderId]) } catch { /* pode já estar gerada */ }
  let rastreio: string | null = rastreioAtual ?? null
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    try {
      const d = await buscarShipment(orderId)
      rastreio = d.tracking ?? d.self_tracking ?? rastreio
      if (d.generated_at || d.status === 'generated' || d.status === 'posted') break
    } catch { /* segue tentando */ }
  }
  const pr = await imprimirEtiquetas([orderId])

  await service.from('pedidos').update({
    frete_etiqueta_url: pr.url, frete_rastreio: rastreio, status: statusAtual === 'pago' ? 'enviado' : statusAtual,
  }).eq('id', pedidoId)

  return { etiqueta_url: pr.url, rastreio, me_order_id: orderId }
}
