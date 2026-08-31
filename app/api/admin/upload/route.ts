import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseServer'
import { isStaff } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST (multipart: file) → sobe pro bucket 'pedidos' e devolve a URL pública
export async function POST(req: Request) {
  if (!isStaff(req)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Storage não configurado.' }, { status: 503 }) }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'arquivo ausente' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'imagem muito grande (máx 8MB)' }, { status: 413 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `pedidos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await service.storage.from('pedidos').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = service.storage.from('pedidos').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
