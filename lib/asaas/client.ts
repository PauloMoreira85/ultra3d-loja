import 'server-only'
import type { AsaasCustomer, AsaasCustomerInput, AsaasPayment, AsaasPaymentInput, AsaasPixQrCode, AsaasBoletoInfo } from './types'

function baseUrl(): string {
  return (process.env.ASAAS_ENVIRONMENT ?? 'sandbox') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3'
}
function apiKey(): string {
  const k = process.env.ASAAS_API_KEY
  if (!k) throw new Error('ASAAS_API_KEY não configurada')
  // dotenv trata "$" como expansão; guardamos sem o "$" e readicionamos aqui
  return k.startsWith('$') ? k : `$${k}`
}
async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { access_token: apiKey(), 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'AAdega/1.0', ...(init.headers ?? {}) },
    cache: 'no-store',
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`Asaas ${path}: ${body?.errors?.[0]?.description || body?.message || `HTTP ${res.status}`}`)
  return body as T
}

export const criarCustomer = (input: AsaasCustomerInput) => asaasFetch<AsaasCustomer>('/customers', { method: 'POST', body: JSON.stringify(input) })
export const buscarCustomer = (id: string) => asaasFetch<AsaasCustomer>(`/customers/${id}`, { method: 'GET' })
export const criarCobranca = (input: AsaasPaymentInput) => asaasFetch<AsaasPayment>('/payments', { method: 'POST', body: JSON.stringify(input) })
export const obterPixQrCode = (paymentId: string) => asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, { method: 'GET' })
export const obterBoleto = (paymentId: string) => asaasFetch<AsaasBoletoInfo>(`/payments/${paymentId}/identificationField`, { method: 'GET' })
