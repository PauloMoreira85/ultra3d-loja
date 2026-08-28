'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import { brl } from '@/lib/supabase'

type Pedido = {
  codigo: number; status: string; total: number; subtotal: number; frete: number; forma_pagamento: string | null
  cliente_nome: string | null; frete_servico: string | null; frete_rastreio: string | null
  asaas_invoice_url: string | null; asaas_boleto_url: string | null; asaas_linha_digitavel: string | null
  asaas_pix_qrcode_base64: string | null; asaas_pix_copia_cola: string | null
}
type Item = { descricao: string; quantidade: number; valor_total: number }

const STATUS: Record<string, { label: string; cor: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cor: '#b7791f' },
  pago: { label: 'Pagamento confirmado ✓', cor: '#2f855a' },
  em_producao: { label: 'Em produção', cor: '#3182ce' },
  enviado: { label: 'Enviado', cor: '#805ad5' },
  entregue: { label: 'Entregue', cor: '#276749' },
  cancelado: { label: 'Cancelado', cor: '#c53030' },
}

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<Pedido | null>(null)
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/pedido/' + id)
      const j = await r.json()
      if (!r.ok) { setErro(j.error || 'pedido não encontrado'); setCarregando(false); return }
      setP(j.pedido); setItens(j.itens); setCarregando(false)
    } catch { setErro('falha ao carregar'); setCarregando(false) }
  }, [id])

  useEffect(() => { carregar() }, [carregar])
  // poll enquanto aguarda pagamento
  useEffect(() => {
    if (p && p.status === 'aguardando_pagamento') {
      const t = setInterval(carregar, 8000)
      return () => clearInterval(t)
    }
  }, [p, carregar])

  const copiar = (t: string) => navigator.clipboard?.writeText(t)

  if (carregando) return <><Header /><main className="max-w-lg mx-auto px-5 py-20 text-center text-[#15153f]/50">carregando…</main></>
  if (erro || !p) return <><Header /><main className="max-w-lg mx-auto px-5 py-20 text-center text-[#15153f]/60">{erro || 'Pedido não encontrado.'}</main></>

  const st = STATUS[p.status] ?? { label: p.status, cor: '#718096' }
  const aguardando = p.status === 'aguardando_pagamento'

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-5 pb-20 pt-6">
        <div className="text-center mb-5">
          <span className="text-xs tracking-widest uppercase text-[#C9A86A] font-bold">Pedido #{p.codigo}</span>
          <div className="mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold text-white" style={{ background: st.cor }}>{st.label}</div>
        </div>

        {aguardando && p.forma_pagamento === 'pix' && p.asaas_pix_copia_cola && (
          <section className="rounded-2xl bg-white border border-[#15153f]/8 p-5 text-center mb-4">
            <h2 className="font-bold text-[#15153f] mb-3">Pague com Pix</h2>
            {p.asaas_pix_qrcode_base64 && <img src={`data:image/png;base64,${p.asaas_pix_qrcode_base64}`} alt="QR Pix" className="h-52 w-52 mx-auto rounded-xl border" />}
            <button onClick={() => copiar(p.asaas_pix_copia_cola!)} className="mt-4 w-full rounded-xl bg-[#15153f] text-white font-bold py-3 hover:bg-[#333389]">Copiar código Pix</button>
            <p className="text-xs text-[#15153f]/45 mt-2">Assim que o pagamento cair, esta página atualiza sozinha.</p>
          </section>
        )}

        {aguardando && p.forma_pagamento === 'boleto' && (
          <section className="rounded-2xl bg-white border border-[#15153f]/8 p-5 text-center mb-4">
            <h2 className="font-bold text-[#15153f] mb-3">Boleto</h2>
            {p.asaas_linha_digitavel && <div className="text-sm break-all text-[#15153f]/70 mb-2">{p.asaas_linha_digitavel} <button onClick={() => copiar(p.asaas_linha_digitavel!)} className="font-bold text-[#333389]">copiar</button></div>}
            {p.asaas_boleto_url && <a href={p.asaas_boleto_url} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-[#15153f] text-white font-bold px-6 py-3">Abrir boleto (PDF)</a>}
          </section>
        )}

        {aguardando && p.forma_pagamento === 'cartao' && p.asaas_invoice_url && (
          <section className="rounded-2xl bg-white border border-[#15153f]/8 p-5 text-center mb-4">
            <h2 className="font-bold text-[#15153f] mb-3">Pagamento no cartão</h2>
            <a href={p.asaas_invoice_url} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-[#15153f] text-white font-bold px-6 py-3">Pagar com cartão</a>
          </section>
        )}

        {aguardando && p.asaas_invoice_url && p.forma_pagamento !== 'cartao' && (
          <p className="text-center text-sm mb-4"><a href={p.asaas_invoice_url} target="_blank" rel="noreferrer" className="text-[#333389] font-semibold underline">Abrir página de pagamento do Asaas</a></p>
        )}

        {!aguardando && (
          <section className="rounded-2xl bg-[#2f855a]/8 border border-[#2f855a]/20 p-5 text-center mb-4">
            <p className="text-[#276749] font-semibold">Recebemos seu pagamento! 🎉 Já vamos imprimir seu pedido.</p>
            {p.frete_rastreio && <p className="text-sm mt-2 text-[#15153f]/70">Rastreio: <b>{p.frete_rastreio}</b></p>}
          </section>
        )}

        <section className="rounded-2xl bg-white border border-[#15153f]/8 p-4">
          {itens.map((it, i) => (
            <div key={i} className="flex justify-between text-sm py-1"><span className="text-[#15153f]/80">{it.quantidade}× {it.descricao}</span><span className="font-semibold">{brl(it.valor_total)}</span></div>
          ))}
          <div className="border-t border-[#15153f]/10 mt-2 pt-2 text-sm">
            <div className="flex justify-between text-[#15153f]/60"><span>Subtotal</span><span>{brl(p.subtotal)}</span></div>
            <div className="flex justify-between text-[#15153f]/60"><span>Frete {p.frete_servico ? `(${p.frete_servico})` : ''}</span><span>{Number(p.frete) > 0 ? brl(p.frete) : 'grátis'}</span></div>
            <div className="flex justify-between font-extrabold text-[#15153f] mt-1"><span>Total</span><span>{brl(p.total)}</span></div>
          </div>
        </section>

        <p className="text-center text-xs text-[#15153f]/40 mt-4">Guarde este link para acompanhar seu pedido.</p>
      </main>
    </>
  )
}
