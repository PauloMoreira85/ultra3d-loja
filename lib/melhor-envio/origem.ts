import 'server-only'

/** Endereço de origem (remetente) — vem das env ORIGEM_* (Maringá por padrão). */
const e = (k: string, d = '') => (process.env[k]?.trim() || d)
export const ORIGEM = {
  nome: e('ORIGEM_NOME', 'Ultra 3D Brasil'),
  cnpj: e('ORIGEM_CNPJ'),
  email: e('ORIGEM_EMAIL', 'contato@ultra3dbrasil.com.br'),
  telefone: e('ORIGEM_TELEFONE'),
  cep: e('ORIGEM_CEP'),
  rua: e('ORIGEM_RUA'),
  numero: e('ORIGEM_NUMERO'),
  complemento: e('ORIGEM_COMPLEMENTO'),
  bairro: e('ORIGEM_BAIRRO'),
  cidade: e('ORIGEM_CIDADE', 'Maringá'),
  uf: e('ORIGEM_UF', 'PR'),
}
export const temOrigem = () => !!(ORIGEM.cep && ORIGEM.rua && ORIGEM.numero)
