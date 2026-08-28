'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, brl, type Produto } from '@/lib/supabase'

type Item = { id: string; produto_id: string | null; descricao: string; quantidade: number; preco_unitario: number; valor_total: number }
type Pedido = {
  id: string; codigo: number; origem: string; status: string; forma_pagamento: string | null
  subtotal: number; frete: number; total: number
  cliente_nome: string | null; cliente_telefone: string | null
  cidade: string | null; uf: string | null; frete_rastreio: string | null
  observacoes: string | null; created_at: string; itens_pedido: Item[]
}

const STATUS: { v: string; label: string; cor: string }[] = [
  { v: 'aguardando_pagamento', label: 'Aguardando pgto', cor: '#b7791f' },
  { v: 'pago', label: 'Pago', cor: '#2f855a' },
  { v: 'em_producao', label: 'Em produção', cor: '#3182ce' },
  { v: 'enviado', label: 'Enviado', cor: '#805ad5' },
  { v: 'entregue', label: 'Entregue', cor: '#276749' },
  { v: 'cancelado', label: 'Cancelado', cor: '#c53030' },
]
const statusInfo = (v: string) => STATUS.find(s => s.v === v) ?? { v, label: v, cor: '#718096' }
const PAG = [
  { v: 'pix', label: 'Pix' }, { v: 'cartao', label: 'Cartão' },
  { v: 'boleto', label: 'Boleto' }, { v: 'dinheiro', label: 'Dinheiro' },
]
const fmtData = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Admin() {
  const [senha, setSenha] = useState('')
  const [autorizado, setAutorizado] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fOrigem, setFOrigem] = useState('')
  const [novo, setNovo] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('u3d_admin')
    if (s) { setSenha(s); setAutorizado(true) }
  }, [])

  const carregar = useCallback(async (s: string) => {
    setLoading(true); setErro('')
    try {
      const qs = new URLSearchParams()
      if (fStatus) qs.set('status', fStatus)
      if (fOrigem) qs.set('origem', fOrigem)
      const r = await fetch('/api/admin/pedidos?' + qs, { headers: { 'x-admin-senha': s } })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'erro')
      setPedidos(j.pedidos)
    } catch (e) { setErro(e instanceof Error ? e.message : 'erro') }
    setLoading(false)
  }, [fStatus, fOrigem])

  useEffect(() => {
    if (!autorizado) return
    carregar(senha)
    supabase.from('produtos').select('*').eq('ativo', true).order('nome').then(({ data }) => setProdutos((data ?? []) as Produto[]))
  }, [autorizado, carregar, senha])

  async function entrar() {
    setErro('')
    const r = await fetch('/api/admin/ping', { headers: { 'x-admin-senha': senha } })
    if (r.ok) { localStorage.setItem('u3d_admin', senha); setAutorizado(true) }
    else if (r.status === 401) setErro('Senha incorreta.')
    else setErro('Painel não configurado (defina ADMIN_SENHA no Vercel).')
  }

  async function mudarStatus(id: string, status: string) {
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    await fetch('/api/admin/pedidos/' + id, { method: 'PATCH', headers: { 'x-admin-senha': senha, 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
  }
  async function apagar(id: string) {
    if (!confirm('Apagar este pedido?')) return
    await fetch('/api/admin/pedidos/' + id, { method: 'DELETE', headers: { 'x-admin-senha': senha } })
    setPedidos(ps => ps.filter(p => p.id !== id))
  }

  const metricas = useMemo(() => {
    const pagos = pedidos.filter(p => ['pago', 'em_producao', 'enviado', 'entregue'].includes(p.status))
    const receita = pagos.reduce((s, p) => s + Number(p.total), 0)
    const aguardando = pedidos.filter(p => p.status === 'aguardando_pagamento').length
    const produzir = pedidos.filter(p => ['pago', 'em_producao'].includes(p.status)).length
    return { receita, aguardando, produzir, total: pedidos.length }
  }, [pedidos])

  if (!autorizado) return (
    <div className="min-h-screen grid place-items-center bg-[#faf9f5] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-[#15153f]/10 p-7 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ultra.png" alt="Ultra 3D Brasil" className="h-11 mx-auto mb-5" />
        <h1 className="serif text-2xl font-semibold text-[#15153f]">Painel / PDV</h1>
        <p className="text-sm text-[#15153f]/55 mt-1 mb-5">Acesso restrito</p>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()}
          placeholder="Senha do painel" className="w-full rounded-lg border border-[#15153f]/15 px-4 py-2.5 mb-3 outline-none focus:border-[#C9A86A]" />
        <button onClick={entrar} className="w-full rounded-lg bg-[#15153f] text-white font-bold py-2.5 hover:bg-[#333389] transition">Entrar</button>
        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#15153f]/10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ultra.png" alt="" className="h-8" />
            <span className="serif text-xl font-semibold text-[#15153f]">Painel / PDV</span>
          </div>
          <button onClick={() => setNovo(true)} className="rounded-full bg-[#C9A86A] text-[#15153f] font-bold px-5 py-2.5 text-sm hover:bg-[#b8955a] transition">+ Pedido manual</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {/* métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card titulo="Receita (pagos)" valor={brl(metricas.receita)} />
          <Card titulo="A produzir" valor={String(metricas.produzir)} />
          <Card titulo="Aguardando pgto" valor={String(metricas.aguardando)} />
          <Card titulo="Total de pedidos" valor={String(metricas.total)} />
        </div>

        {/* filtros */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 text-sm bg-white">
            <option value="">Todos os status</option>
            {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <select value={fOrigem} onChange={e => setFOrigem(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 text-sm bg-white">
            <option value="">Site + Manual</option>
            <option value="site">Só site</option>
            <option value="manual">Só manual</option>
          </select>
          <button onClick={() => carregar(senha)} className="rounded-lg border border-[#15153f]/15 bg-white px-3 py-2 text-sm font-semibold hover:border-[#C9A86A]">Atualizar</button>
          {loading && <span className="text-sm text-[#15153f]/50">carregando…</span>}
          {erro && <span className="text-sm text-red-600">{erro}</span>}
        </div>

        {/* lista */}
        <div className="space-y-3">
          {pedidos.map(p => {
            const si = statusInfo(p.status)
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-[#15153f]/8 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#15153f]">#{p.codigo}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: p.origem === 'manual' ? '#15153f' : '#C9A86A', color: p.origem === 'manual' ? '#fff' : '#15153f' }}>
                        {p.origem === 'manual' ? 'MANUAL' : 'SITE'}
                      </span>
                      <span className="text-xs text-[#15153f]/45">{fmtData(p.created_at)}</span>
                    </div>
                    <div className="mt-1 font-semibold text-[#15153f]">{p.cliente_nome || 'Cliente'}</div>
                    <div className="text-xs text-[#15153f]/55">
                      {p.cliente_telefone && <span>{p.cliente_telefone} · </span>}
                      {p.cidade && <span>{p.cidade}/{p.uf} · </span>}
                      {p.forma_pagamento && <span className="uppercase">{p.forma_pagamento}</span>}
                    </div>
                    <ul className="mt-2 text-sm text-[#15153f]/75 space-y-0.5">
                      {p.itens_pedido?.map(it => (
                        <li key={it.id}>{it.quantidade}× {it.descricao} <span className="text-[#15153f]/45">— {brl(it.valor_total)}</span></li>
                      ))}
                    </ul>
                    {p.observacoes && <p className="mt-1 text-xs italic text-[#15153f]/50">obs: {p.observacoes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="serif text-xl font-bold text-[#333389]">{brl(p.total)}</div>
                    {Number(p.frete) > 0 && <div className="text-[11px] text-[#15153f]/45">frete {brl(p.frete)}</div>}
                    <select value={p.status} onChange={e => mudarStatus(p.id, e.target.value)}
                      className="mt-2 rounded-full text-xs font-bold px-3 py-1.5 text-white border-0 cursor-pointer" style={{ background: si.cor }}>
                      {STATUS.map(s => <option key={s.v} value={s.v} style={{ background: '#fff', color: '#15153f' }}>{s.label}</option>)}
                    </select>
                    <button onClick={() => apagar(p.id)} className="block ml-auto mt-2 text-[11px] text-[#15153f]/40 hover:text-red-600">apagar</button>
                  </div>
                </div>
              </div>
            )
          })}
          {!loading && !pedidos.length && <p className="text-center text-[#15153f]/45 py-16">Nenhum pedido ainda.</p>}
        </div>
      </main>

      {novo && <NovoPedido produtos={produtos} senha={senha} onClose={() => setNovo(false)} onSalvo={() => { setNovo(false); carregar(senha) }} />}
    </div>
  )
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#15153f]/8 p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#15153f]/45 font-semibold">{titulo}</div>
      <div className="serif text-2xl font-bold text-[#15153f] mt-1">{valor}</div>
    </div>
  )
}

type Linha = { produto_id: string | null; descricao: string; quantidade: number; preco_unitario: number }

function NovoPedido({ produtos, senha, onClose, onSalvo }: { produtos: Produto[]; senha: string; onClose: () => void; onSalvo: () => void }) {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [busca, setBusca] = useState('')
  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [frete, setFrete] = useState(0)
  const [pagamento, setPagamento] = useState('dinheiro')
  const [status, setStatus] = useState('pago')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return produtos.slice(0, 8)
    return produtos.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 8)
  }, [busca, produtos])

  function addProduto(p: Produto) {
    setLinhas(ls => {
      const ex = ls.find(l => l.produto_id === p.id)
      if (ex) return ls.map(l => l.produto_id === p.id ? { ...l, quantidade: l.quantidade + 1 } : l)
      return [...ls, { produto_id: p.id, descricao: p.nome, quantidade: 1, preco_unitario: Number(p.preco) }]
    })
    setBusca('')
  }
  function addLivre() { setLinhas(ls => [...ls, { produto_id: null, descricao: '', quantidade: 1, preco_unitario: 0 }]) }
  function upd(i: number, patch: Partial<Linha>) { setLinhas(ls => ls.map((l, x) => x === i ? { ...l, ...patch } : l)) }
  function rm(i: number) { setLinhas(ls => ls.filter((_, x) => x !== i)) }

  const subtotal = linhas.reduce((s, l) => s + l.preco_unitario * l.quantidade, 0)
  const total = subtotal + Number(frete || 0)

  async function salvar() {
    if (!linhas.length) { setErro('adicione ao menos 1 item'); return }
    setSalvando(true); setErro('')
    const r = await fetch('/api/admin/pedidos', {
      method: 'POST', headers: { 'x-admin-senha': senha, 'content-type': 'application/json' },
      body: JSON.stringify({ itens: linhas, cliente_nome: cliente, cliente_telefone: telefone, frete: Number(frete || 0), forma_pagamento: pagamento, status, observacoes: obs }),
    })
    const j = await r.json()
    setSalvando(false)
    if (!r.ok) { setErro(j.error || 'erro'); return }
    onSalvo()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-[#faf9f5] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#faf9f5] px-5 pt-5 pb-3 border-b border-[#15153f]/10 flex items-center justify-between">
          <h2 className="serif text-xl font-semibold text-[#15153f]">Novo pedido manual</h2>
          <button onClick={onClose} className="text-2xl text-[#15153f]/40 leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* buscar produto */}
          <div>
            <label className="text-xs font-semibold text-[#15153f]/60">Adicionar produto</label>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no catálogo…"
              className="w-full rounded-lg border border-[#15153f]/15 px-3 py-2 mt-1 outline-none focus:border-[#C9A86A]" />
            {busca && (
              <div className="mt-1 rounded-lg border border-[#15153f]/10 bg-white divide-y divide-[#15153f]/5">
                {filtrados.map(p => (
                  <button key={p.id} onClick={() => addProduto(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f5] flex justify-between">
                    <span>{p.nome}</span><span className="text-[#333389] font-semibold">{brl(p.preco)}</span>
                  </button>
                ))}
                {!filtrados.length && <div className="px-3 py-2 text-sm text-[#15153f]/40">nada encontrado</div>}
              </div>
            )}
            <button onClick={addLivre} className="mt-2 text-sm text-[#333389] font-semibold">+ item avulso</button>
          </div>

          {/* linhas */}
          {linhas.length > 0 && (
            <div className="space-y-2">
              {linhas.map((l, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-[#15153f]/10 p-2">
                  <input value={l.descricao} onChange={e => upd(i, { descricao: e.target.value })} placeholder="descrição"
                    className="flex-1 min-w-0 text-sm px-2 py-1 outline-none" />
                  <input type="number" min={1} value={l.quantidade} onChange={e => upd(i, { quantidade: Math.max(1, +e.target.value) })}
                    className="w-14 text-sm px-2 py-1 border border-[#15153f]/10 rounded text-center" />
                  <input type="number" min={0} step="0.01" value={l.preco_unitario} onChange={e => upd(i, { preco_unitario: +e.target.value })}
                    className="w-20 text-sm px-2 py-1 border border-[#15153f]/10 rounded text-right" />
                  <button onClick={() => rm(i)} className="text-[#15153f]/30 hover:text-red-600 px-1">×</button>
                </div>
              ))}
            </div>
          )}

          {/* cliente + pagamento */}
          <div className="grid grid-cols-2 gap-2">
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" className="rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
            <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Telefone" className="rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
            <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
              {PAG.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
              {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <label className="col-span-2 flex items-center gap-2 text-sm text-[#15153f]/70">
              Frete R$ <input type="number" min={0} step="0.01" value={frete} onChange={e => setFrete(+e.target.value)} className="w-24 rounded-lg border border-[#15153f]/15 px-3 py-2" />
            </label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações" rows={2} className="col-span-2 rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#15153f]/10 p-4 flex items-center justify-between">
          <div><span className="text-xs text-[#15153f]/50">Total</span><div className="serif text-xl font-bold text-[#15153f]">{brl(total)}</div></div>
          <button onClick={salvar} disabled={salvando} className="rounded-full bg-[#15153f] text-white font-bold px-7 py-3 hover:bg-[#333389] transition disabled:opacity-50">
            {salvando ? 'salvando…' : 'Salvar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
