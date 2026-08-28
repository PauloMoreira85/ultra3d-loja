import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _c: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_c) {
    // URL + anon key são públicas (seguras no client). Fallback = projeto ultra3d-loja.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://feonykqatexoplqtpqla.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb255a3FhdGV4b3BscXRwcWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjE1MzUsImV4cCI6MjEwMzQ5NzUzNX0.L5RykORCBJjyjc6t3yEG2yoV2b6k1CpsBtmZaNHME1c'
    _c = createClient(url, key)
  }
  return _c
}
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, p) { const c = getClient() as unknown as Record<string | symbol, unknown>; const v = c[p]; return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(c) : v },
})

export type Categoria = { id: string; nome: string; ordem: number; ativo: boolean }

export type Produto = {
  id: string; categoria_id: string | null; nome: string; descricao: string | null
  preco: number; sku: string | null; foto_url: string | null; material: string | null
  peso_g: number; comprimento_cm: number; largura_cm: number; altura_cm: number
  tempo_impressao_h?: number; estoque: number | null; ativo: boolean; ordem: number
}

export type ConfigLoja = {
  id: number; pedido_minimo: number; frete_gratis_acima: number | null
  retirada_maringa: boolean; aberto: boolean; obs: string | null
}

export type Perfil = {
  id: string; nome: string | null; telefone: string | null; cpf: string | null
  asaas_customer_id: string | null; papel: string
  cep: string | null; rua: string | null; numero: string | null; complemento: string | null
  bairro: string | null; cidade: string | null; uf: string | null
}

export const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** true quando o produto controla estoque e está zerado. estoque null = sob encomenda. */
export const esgotado = (p: Produto) => p.estoque != null && p.estoque <= 0
