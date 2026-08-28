import 'server-only'
import { meFetch } from './client'
import { ORIGEM } from './origem'

export interface ItemFrete {
  peso_g: number; comprimento_cm: number; largura_cm: number; altura_cm: number
  quantidade: number; valor: number  // valor unitário (R$) p/ seguro
}
export interface OpcaoFrete {
  id: number; nome: string; empresa: string; preco: number; prazo: number
}

// mínimos dos Correios (cm / kg)
const clamp = (v: number, min: number) => Math.max(v || 0, min)

export async function cotarFrete(cepDestino: string, itens: ItemFrete[]): Promise<OpcaoFrete[]> {
  const cepOrigem = ORIGEM.cep.replace(/\D/g, '')
  const cepDest = (cepDestino || '').replace(/\D/g, '')
  if (cepOrigem.length !== 8) throw new Error('CEP de origem não configurado (ORIGEM_CEP)')
  if (cepDest.length !== 8) throw new Error('CEP de destino inválido')
  if (!itens.length) throw new Error('Sem itens para cotar')

  const products = itens.map((it, i) => ({
    id: `p-${i}`,
    width: clamp(it.largura_cm, 11),
    height: clamp(it.altura_cm, 2),
    length: clamp(it.comprimento_cm, 16),
    weight: clamp((it.peso_g || 0) / 1000, 0.3),
    insurance_value: Math.max(it.valor || 0, 0),
    quantity: it.quantidade,
  }))

  const resp = await meFetch<Array<{ id: number; name: string; company?: { name: string }; price?: string; delivery_time?: number; error?: string }>>(
    '/me/shipment/calculate', { method: 'POST', body: JSON.stringify({ from: { postal_code: cepOrigem }, to: { postal_code: cepDest }, products }) },
  )

  return resp
    .filter(s => !s.error && s.price)
    .map(s => ({ id: s.id, nome: s.name, empresa: s.company?.name ?? '', preco: parseFloat(s.price as string), prazo: s.delivery_time ?? 0 }))
    .sort((a, b) => a.preco - b.preco)
}
