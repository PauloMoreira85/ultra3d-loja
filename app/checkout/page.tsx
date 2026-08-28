'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { brl } from '@/lib/supabase'
import { useCart } from '@/lib/cart'

type Opcao = { id: number; nome: string; empresa: string; preco: number; prazo: number }

export default function Checkout() {
  const { items, clear } = useCart()
  const router = useRouter()
  const subtotal = items.reduce((s, x) => s + x.produto.preco * x.qtd, 0)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [cpf, setCpf] = useState('')

  const [entrega, setEntrega] = useState<'entrega' | 'retirada'>('entrega')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState(''); const [numero, setNumero] = useState(''); const [compl, setCompl] = useState('')
  const [bairro, setBairro] = useState(''); const [cidade, setCidade] = useState(''); const [uf, setUf] = useState('')

  const [opcoes, setOpcoes] = useState<Opcao[]>([])
  const [freteSel, setFreteSel] = useState<Opcao | null>(null)
  const [freteMsg, setFreteMsg] = useState('')
  const [cotando, setCotando] = useState(false)

  const [forma, setForma] = useState<'pix' | 'boleto' | 'cartao'>('pix')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const freteValor = entrega === 'retirada' ? 0 : (freteSel?.preco ?? 0)
  const total = subtotal + freteValor

  async function buscarCep(v: string) {
    const c = v.replace(/\D/g, '')
    if (c.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`)
      const d = await r.json()
      if (!d.erro) { setRua(d.logradouro || ''); setBairro(d.bairro || ''); setCidade(d.localidade || ''); setUf(d.uf || '') }
    } catch { /* ignora */ }
    cotarFrete(c)
  }

  async function cotarFrete(cepDigits: string) {
    setCotando(true); setFreteMsg(''); setOpcoes([]); setFreteSel(null)
    const itens = items.map(x => ({
      peso_g: x.produto.peso_g, comprimento_cm: x.produto.comprimento_cm, largura_cm: x.produto.largura_cm,
      altura_cm: x.produto.altura_cm, quantidade: x.qtd, valor: x.produto.preco,
    }))
    const r = await fetch('/api/frete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cep: cepDigits, itens }) })
    const j = await r.json()
    setCotando(false)
    if (j.opcoes?.length) { setOpcoes(j.opcoes); setFreteSel(j.opcoes[0]) }
    else setFreteMsg('Frete automático indisponível para este CEP — combinamos o envio após o pedido.')
  }

  async function finalizar() {
    setErro('')
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (cpf.replace(/\D/g, '').length !== 11) return setErro('CPF inválido (o pagamento exige).')
    if (entrega === 'entrega' && cep.replace(/\D/g, '').length !== 8) return setErro('Informe o CEP de entrega.')
    setEnviando(true)
    const body = {
      itens: items.map(x => ({ produto_id: x.produto.id, quantidade: x.qtd })),
      cliente: { nome, email, telefone: tel, cpf },
      endereco: entrega === 'entrega' ? { cep, rua, numero, complemento: compl, bairro, cidade, uf } : undefined,
      frete: entrega === 'retirada'
        ? { retirada: true }
        : (freteSel ? { servico: freteSel.nome, servico_id: freteSel.id, transportadora: freteSel.empresa, preco: freteSel.preco, prazo: freteSel.prazo } : { preco: 0 }),
      forma,
    }
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    setEnviando(false)
    if (!r.ok) { setErro(j.error || 'falha ao finalizar'); return }
    clear()
    router.push('/pedido/' + j.pedidoId)
  }

  const podeFinalizar = useMemo(() => items.length > 0, [items])
  if (!podeFinalizar) return (
    <><Header /><main className="max-w-2xl mx-auto px-5 py-16 text-center text-[#15153f]/60">Seu carrinho está vazio. <a href="/" className="text-[#333389] font-bold">Ver catálogo</a></main></>
  )

  const inp = 'w-full rounded-lg border border-[#15153f]/15 px-3 py-2.5 outline-none focus:border-[#C9A86A]'

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-5 pb-32 pt-6">
        <h1 className="serif text-3xl font-semibold text-[#15153f] mb-6">Finalizar compra</h1>

        {/* itens */}
        <section className="rounded-2xl bg-white border border-[#15153f]/8 p-4 mb-5">
          {items.map(x => (
            <div key={x.produto.id} className="flex justify-between text-sm py-1">
              <span className="text-[#15153f]/80">{x.qtd}× {x.produto.nome}</span>
              <span className="font-semibold text-[#15153f]">{brl(x.produto.preco * x.qtd)}</span>
            </div>
          ))}
        </section>

        {/* dados */}
        <h2 className="font-bold text-[#15153f] mb-2">Seus dados</h2>
        <div className="grid sm:grid-cols-2 gap-2 mb-5">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inp} />
          <input value={tel} onChange={e => setTel(e.target.value)} placeholder="WhatsApp / telefone" className={inp} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className={inp} />
          <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF" className={inp} />
        </div>

        {/* entrega */}
        <h2 className="font-bold text-[#15153f] mb-2">Entrega</h2>
        <div className="flex gap-2 mb-3">
          {(['entrega', 'retirada'] as const).map(op => (
            <button key={op} onClick={() => setEntrega(op)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${entrega === op ? 'border-[#C9A86A] bg-[#C9A86A]/10 text-[#15153f]' : 'border-[#15153f]/12 text-[#15153f]/60'}`}>
              {op === 'entrega' ? 'Receber em casa' : 'Retirar em Maringá (grátis)'}
            </button>
          ))}
        </div>

        {entrega === 'entrega' && (
          <div className="space-y-2 mb-5">
            <input value={cep} onChange={e => setCep(e.target.value)} onBlur={e => buscarCep(e.target.value)} placeholder="CEP" className={inp} />
            <div className="grid grid-cols-3 gap-2">
              <input value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua" className={`${inp} col-span-2`} />
              <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={compl} onChange={e => setCompl(e.target.value)} placeholder="Complemento" className={inp} />
              <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className={inp} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className={`${inp} col-span-2`} />
              <input value={uf} onChange={e => setUf(e.target.value)} placeholder="UF" maxLength={2} className={inp} />
            </div>

            {cotando && <p className="text-sm text-[#15153f]/50">calculando frete…</p>}
            {opcoes.length > 0 && (
              <div className="space-y-1.5">
                {opcoes.map(o => (
                  <label key={o.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer ${freteSel?.id === o.id ? 'border-[#C9A86A] bg-[#C9A86A]/5' : 'border-[#15153f]/12'}`}>
                    <span className="text-sm"><input type="radio" checked={freteSel?.id === o.id} onChange={() => setFreteSel(o)} className="mr-2" />{o.empresa} {o.nome} <span className="text-[#15153f]/45">· {o.prazo} dias úteis</span></span>
                    <span className="font-bold text-[#333389]">{brl(o.preco)}</span>
                  </label>
                ))}
              </div>
            )}
            {freteMsg && <p className="text-xs text-[#b7791f]">{freteMsg}</p>}
          </div>
        )}

        {/* pagamento */}
        <h2 className="font-bold text-[#15153f] mb-2">Pagamento</h2>
        <div className="flex gap-2 mb-5">
          {([['pix', 'Pix'], ['boleto', 'Boleto'], ['cartao', 'Cartão']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setForma(v)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${forma === v ? 'border-[#C9A86A] bg-[#C9A86A]/10 text-[#15153f]' : 'border-[#15153f]/12 text-[#15153f]/60'}`}>{l}</button>
          ))}
        </div>

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#15153f]/10 bg-[#faf9f5]/95 backdrop-blur p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm text-[#15153f]/70"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-[#15153f]/70"><span>Frete</span><span>{entrega === 'retirada' ? 'grátis' : (freteSel ? brl(freteValor) : '—')}</span></div>
          <div className="flex justify-between text-lg font-extrabold text-[#15153f] mt-1"><span>Total</span><span>{brl(total)}</span></div>
          <button onClick={finalizar} disabled={enviando} className="mt-2 w-full rounded-xl bg-[#15153f] text-white font-bold px-4 py-3 hover:bg-[#333389] active:scale-95 transition disabled:opacity-50">
            {enviando ? 'gerando pagamento…' : `Pagar com ${forma === 'pix' ? 'Pix' : forma === 'boleto' ? 'boleto' : 'cartão'}`}
          </button>
        </div>
      </div>
    </>
  )
}
