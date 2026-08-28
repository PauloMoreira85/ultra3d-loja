import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import type { AsaasWebhookPayload } from '@/lib/asaas/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGO = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])

export async function POST(req: Request) {
  // Valida o token configurado no painel do Asaas (Integrações → Webhooks)
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN
  if (esperado && req.headers.get('asaas-access-token') !== esperado) {
    return NextResponse.json({ error: 'token inválido' }, { status: 401 })
  }

  let payload: AsaasWebhookPayload
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { event, payment } = payload
  if (!payment) return NextResponse.json({ ok: true })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ ok: true }) }

  const pedidoId = payment.externalReference
  if (pedidoId) {
    if (PAGO.has(event)) {
      await service.from('pedidos')
        .update({ status: 'pago', asaas_status: payment.status, pago_em: new Date().toISOString() })
        .eq('id', pedidoId).eq('status', 'aguardando_pagamento')
    } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      await service.from('pedidos').update({ asaas_status: payment.status }).eq('id', pedidoId)
    }
  }
  return NextResponse.json({ ok: true })
}
