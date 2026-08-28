import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/ping → 200 se a senha confere (sem tocar no banco)
export function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'senha' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
