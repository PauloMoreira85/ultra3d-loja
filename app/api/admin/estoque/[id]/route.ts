import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff, isDono } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  try { return { service: createServiceClient() } }
  catch { return { erro: 'Banco não configurado no Vercel.' } }
}

const CAMPOS = new Set(['nome', 'categoria', 'unidade', 'quantidade', 'minimo', 'custo_unit', 'obs', 'ativo'])

// PATCH → edita insumo (ou ajusta quantidade). Passe {delta} p/ somar/subtrair.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) if (CAMPOS.has(k)) patch[k] = v

  // ajuste incremental de quantidade (entrada/saída)
  if (body.delta !== undefined) {
    const { data: atual } = await service.from('estoque').select('quantidade').eq('id', id).single()
    patch.quantidade = Number(atual?.quantidade ?? 0) + Number(body.delta)
  }

  const { error } = await service.from('estoque').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE → remove insumo (só dono)
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDono(req)) return NextResponse.json({ error: 'só o dono' }, { status: 403 })
  const { id } = await ctx.params
  const { service, erro } = svc()
  if (!service) return NextResponse.json({ error: erro }, { status: 503 })
  const { error } = await service.from('estoque').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
