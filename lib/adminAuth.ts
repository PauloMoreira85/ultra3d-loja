import 'server-only'
import crypto from 'crypto'

export type Papel = 'dono' | 'funcionario'
export interface Sessao { fid: string | null; nome: string; papel: Papel; exp: number }

const COOKIE = 'u3d_sessao'
const DIAS = 7

function segredo(): string {
  return process.env.ADMIN_SENHA || 'sem-senha-configurada'
}

function b64url(b: Buffer | string): string {
  return Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function assinaParte(data: string): string {
  return b64url(crypto.createHmac('sha256', segredo()).update(data).digest())
}

/** Gera o token de sessão (payload.assinatura). */
export function assinarSessao(s: Omit<Sessao, 'exp'>): { token: string; sessao: Sessao } {
  const sessao: Sessao = { ...s, exp: Date.now() + DIAS * 864e5 }
  const payload = b64url(JSON.stringify(sessao))
  return { token: `${payload}.${assinaParte(payload)}`, sessao }
}

function verificaToken(token: string | undefined | null): Sessao | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const esperado = assinaParte(payload)
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null
  try {
    const s = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as Sessao
    if (!s.exp || s.exp < Date.now()) return null
    return s
  } catch { return null }
}

/** Lê e valida a sessão do cookie do request. */
export function getSessao(req: Request): Sessao | null {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'))
  return verificaToken(m ? decodeURIComponent(m[1]) : null)
}

export const isStaff = (req: Request) => getSessao(req) !== null
export const isDono = (req: Request) => getSessao(req)?.papel === 'dono'

/** Set-Cookie de login (httpOnly, 7 dias). */
export function cookieLogin(token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${DIAS * 86400}`
}
export function cookieLogout(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
}
