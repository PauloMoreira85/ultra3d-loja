import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarCustomer, buscarCustomer, criarCobranca, obterPixQrCode, obterBoleto } from './client'
import type { AsaasBillingType } from './types'

const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

export type FormaCobranca = 'pix' | 'boleto' | 'cartao'
const BILLING: Record<FormaCobranca, AsaasBillingType> = { pix: 'PIX', boleto: 'BOLETO', cartao: 'CREDIT_CARD' }

export interface ResultadoCobranca {
  forma: FormaCobranca
  invoiceUrl: string | null
  pix?: { base64: string; copiaCola: string } | null
  boleto?: { url: string | null; linhaDigitavel: string | null } | null
}

/**
 * Gera (ou reaproveita) a cobrança Asaas de um pedido e grava os dados no banco.
 * Precisa de service client (ignora RLS). O pedido precisa de cliente_cpf válido.
 */
export async function gerarCobrancaPedido(
  service: SupabaseClient,
  pedidoId: string,
  forma: FormaCobranca,
): Promise<ResultadoCobranca> {
  const { data: pedido, error } = await service.from('pedidos').select('*').eq('id', pedidoId).single()
  if (error || !pedido) throw new Error('Pedido não encontrado')

  const cpf = onlyDigits(pedido.cliente_cpf)
  if (cpf.length !== 11 && cpf.length !== 14) throw new Error('Informe o CPF/CNPJ do cliente para gerar a cobrança')

  // customer: reusa asaas_customer_id do perfil se houver
  let customerId: string | null = null
  if (pedido.user_id) {
    const { data: perfil } = await service.from('perfis').select('asaas_customer_id').eq('id', pedido.user_id).single()
    customerId = perfil?.asaas_customer_id ?? null
    if (customerId) { try { await buscarCustomer(customerId) } catch { customerId = null } }
  }
  if (!customerId) {
    const tel = onlyDigits(pedido.cliente_telefone)
    const dados = {
      name: pedido.cliente_nome || 'Cliente Ultra 3D Brasil',
      cpfCnpj: cpf,
      email: pedido.cliente_email || undefined,
      externalReference: pedido.user_id ? `cliente-${pedido.user_id}` : `pedido-${pedidoId}`,
      notificationDisabled: false,
    }
    const comTel = tel.length === 10 || tel.length === 11 ? { ...dados, mobilePhone: tel } : dados
    let c
    try { c = await criarCustomer(comTel) }
    catch (e) {
      // telefone recusado pelo Asaas → cria sem telefone (não trava a venda)
      if (/celular|phone|telefone/i.test(e instanceof Error ? e.message : '')) c = await criarCustomer(dados)
      else throw e
    }
    customerId = c.id
    if (pedido.user_id) await service.from('perfis').update({ asaas_customer_id: customerId }).eq('id', pedido.user_id)
  }

  const dueDate = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  const cobranca = await criarCobranca({
    customer: customerId!, billingType: BILLING[forma], value: Number(pedido.total), dueDate,
    description: `Ultra 3D Brasil — Pedido #${pedido.codigo ?? String(pedido.id).slice(0, 8)}`,
    externalReference: pedido.id,
  })

  const patch: Record<string, unknown> = {
    forma_pagamento: forma,
    status: pedido.status === 'rascunho' ? 'aguardando_pagamento' : pedido.status,
    asaas_payment_id: cobranca.id, asaas_status: cobranca.status, asaas_invoice_url: cobranca.invoiceUrl,
  }
  const out: ResultadoCobranca = { forma, invoiceUrl: cobranca.invoiceUrl }

  if (forma === 'pix') {
    try {
      const qr = await obterPixQrCode(cobranca.id)
      patch.asaas_pix_qrcode_base64 = qr.encodedImage
      patch.asaas_pix_copia_cola = qr.payload
      patch.asaas_pix_vencimento = qr.expirationDate ? new Date(qr.expirationDate).toISOString() : null
      out.pix = { base64: qr.encodedImage, copiaCola: qr.payload }
    } catch { /* fallback: invoiceUrl */ }
  } else if (forma === 'boleto') {
    patch.asaas_boleto_url = cobranca.bankSlipUrl ?? null
    try {
      const b = await obterBoleto(cobranca.id)
      patch.asaas_linha_digitavel = b.identificationField
      out.boleto = { url: cobranca.bankSlipUrl ?? null, linhaDigitavel: b.identificationField }
    } catch { out.boleto = { url: cobranca.bankSlipUrl ?? null, linhaDigitavel: null } }
  }

  await service.from('pedidos').update(patch).eq('id', pedido.id)
  return out
}
