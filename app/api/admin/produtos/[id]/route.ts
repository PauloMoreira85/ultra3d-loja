import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CAMPOS = new Set(['peso_g', 'tempo_impressao_h', 'preco', 'material', 'ativo', 'estoque'])

// PATCH /api/admin/produtos/:id → edita custo/preço do produto (só dono)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) if (CAMPOS.has(k)) patch[k] = v
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nada a atualizar' }, { status: 422 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Banco não configurado no Vercel.' }, { status: 503 }) }
  const { error } = await service.from('produtos').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
