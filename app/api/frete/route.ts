import { NextResponse } from 'next/server'
import { cotarFrete, type ItemFrete } from '@/lib/melhor-envio/cotacao'
import { temOrigem } from '@/lib/melhor-envio/origem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { cep, itens:[{peso_g,comprimento_cm,largura_cm,altura_cm,quantidade,valor}] }
export async function POST(req: Request) {
  let body: { cep?: string; itens?: ItemFrete[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const cep = (body.cep || '').replace(/\D/g, '')
  if (cep.length !== 8) return NextResponse.json({ error: 'CEP inválido' }, { status: 422 })

  // frete indisponível (sem token/origem) → checkout cai pra retirada / combinar
  if (!process.env.MELHOR_ENVIO_TOKEN || !temOrigem()) {
    return NextResponse.json({ opcoes: [], indisponivel: true })
  }
  try {
    const opcoes = await cotarFrete(cep, body.itens ?? [])
    return NextResponse.json({ opcoes })
  } catch (e) {
    return NextResponse.json({ opcoes: [], indisponivel: true, error: e instanceof Error ? e.message : 'falha' })
  }
}
