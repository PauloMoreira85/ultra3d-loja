import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabaseServer'
import { assinarSessao, cookieLogin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { nome?: string; pin?: string; master?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  // 1) senha-mestra do dono
  if (body.master) {
    if (process.env.ADMIN_SENHA && body.master === process.env.ADMIN_SENHA) {
      const { token, sessao } = assinarSessao({ fid: null, nome: 'Dono', papel: 'dono' })
      const res = NextResponse.json({ ok: true, nome: sessao.nome, papel: sessao.papel })
      res.headers.set('Set-Cookie', cookieLogin(token))
      return res
    }
    return NextResponse.json({ error: 'Senha mestra incorreta.' }, { status: 401 })
  }

  // 2) funcionário: nome + PIN
  const nome = (body.nome || '').trim()
  const pin = (body.pin || '').trim()
  if (!nome || !pin) return NextResponse.json({ error: 'Informe nome e PIN.' }, { status: 422 })

  let service
  try { service = createServiceClient() } catch { return NextResponse.json({ error: 'Painel não configurado no Vercel.' }, { status: 503 }) }

  const { data: f } = await service.from('funcionarios').select('*').ilike('nome', nome).eq('ativo', true).maybeSingle()
  if (!f || !(await bcrypt.compare(pin, f.pin_hash))) {
    return NextResponse.json({ error: 'Nome ou PIN incorretos.' }, { status: 401 })
  }
  const { token, sessao } = assinarSessao({ fid: f.id, nome: f.nome, papel: f.papel })
  const res = NextResponse.json({ ok: true, nome: sessao.nome, papel: sessao.papel })
  res.headers.set('Set-Cookie', cookieLogin(token))
  return res
}
