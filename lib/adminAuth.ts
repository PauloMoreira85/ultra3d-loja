import 'server-only'

/** Confere a senha de admin do painel (header x-admin-senha == ADMIN_SENHA). */
export function isAdmin(req: Request): boolean {
  const senha = process.env.ADMIN_SENHA
  if (!senha) return false // sem senha configurada = painel bloqueado
  return req.headers.get('x-admin-senha') === senha
}
