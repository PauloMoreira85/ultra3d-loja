import 'server-only'

/** Cliente Melhor Envio v2 (cota frete + gera etiqueta). Token OAuth em env. */
function baseUrl(): string {
  return process.env.MELHOR_ENVIO_SANDBOX === 'true'
    ? 'https://sandbox.melhorenvio.com.br/api/v2'
    : 'https://www.melhorenvio.com.br/api/v2'
}
function token(): string {
  const t = process.env.MELHOR_ENVIO_TOKEN
  if (!t) throw new Error('MELHOR_ENVIO_TOKEN não configurado')
  return t
}
function userAgent(): string {
  return `Ultra3DBrasil/1.0 (${process.env.ORIGEM_EMAIL || 'contato@ultra3dbrasil.com.br'})`
}

export async function meFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/json', 'Content-Type': 'application/json',
      'User-Agent': userAgent(), ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    let detalhe = ''
    if (body?.errors && typeof body.errors === 'object') {
      detalhe = Object.values(body.errors as Record<string, unknown>).flat().map(String).join('; ')
    }
    throw new Error(detalhe || body?.message || body?.error || `HTTP ${res.status}`)
  }
  return body as T
}

export const adicionarAoCarrinho = (input: unknown) => meFetch<{ id: string; protocol?: string }>('/me/cart', { method: 'POST', body: JSON.stringify(input) })
export const checkoutCarrinho = (orders: string[]) => meFetch<unknown>('/me/shipment/checkout', { method: 'POST', body: JSON.stringify({ orders }) })
export const gerarEtiquetas = (orders: string[]) => meFetch<unknown>('/me/shipment/generate', { method: 'POST', body: JSON.stringify({ orders }) })
export const imprimirEtiquetas = (orders: string[]) => meFetch<{ url: string }>('/me/shipment/print', { method: 'POST', body: JSON.stringify({ mode: 'private', orders }) })
export const buscarShipment = (id: string) => meFetch<{ tracking?: string; self_tracking?: string; status?: string; generated_at?: string; protocol?: string }>(`/me/shipment/${id}`, { method: 'GET' })
