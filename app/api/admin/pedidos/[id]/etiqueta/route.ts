import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'
import { gerarEtiquetaPedido } from '@/lib/melhor-envio/etiqueta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST → gera etiqueta Melhor Envio (consome saldo da conta ME)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  if (!process.env.MELHOR_ENVIO_TOKEN) return NextResponse.json({ error: 'Melhor Envio não configurado (MELHOR_ENVIO_TOKEN).' }, { status: 503 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Banco não configurado.' }, { status: 503 }) }
  try {
    const r = await gerarEtiquetaPedido(service, id)
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'falha ao gerar etiqueta' }, { status: 502 })
  }
}
