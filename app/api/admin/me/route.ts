import { NextResponse } from 'next/server'
import { getSessao, cookieLogout } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET → sessão atual (quem está logado)
export function GET(req: Request) {
  const s = getSessao(req)
  if (!s) return NextResponse.json({ error: 'sem sessão' }, { status: 401 })
  return NextResponse.json({ nome: s.nome, papel: s.papel })
}

// DELETE → logout
export function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', cookieLogout())
  return res
}
