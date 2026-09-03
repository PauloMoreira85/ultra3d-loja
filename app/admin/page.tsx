'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, brl, type Produto } from '@/lib/supabase'

type ConsumoLinha = { estoque_id: string; nome: string; unidade: string; quantidade: number; custo_unit: number }
type Item = { id: string; produto_id: string | null; descricao: string; quantidade: number; preco_unitario: number; valor_total: number; consumo?: ConsumoLinha[]; peso_g?: number; tempo_h?: number }
type Pedido = {
  id: string; codigo: number; origem: string; status: string; forma_pagamento: string | null
  subtotal: number; frete: number; desconto: number; total: number
  cliente_nome: string | null; cliente_telefone: string | null; cliente_cpf: string | null
  cep: string | null; cidade: string | null; uf: string | null
  frete_rastreio: string | null; frete_etiqueta_url: string | null; impressora: string | null
  imagens: string[] | null; estoque_baixado: boolean; observacoes: string | null; created_at: string; itens_pedido: Item[]
}
type Sessao = { nome: string; papel: 'dono' | 'funcionario' }
type Impressora = { id: string; nome: string; tipo: string | null; ativo: boolean; custo_hora?: number }

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

/** fetch helper — cookie de sessão vai automático (same-origin). */
async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) } })
  let j: Record<string, unknown> = {}
  try { j = await r.json() } catch { /* vazio */ }
  return { ok: r.ok, status: r.status, j }
}

export default function Admin() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [checando, setChecando] = useState(true)

  useEffect(() => {
    api('/api/admin/me').then(({ ok, j }) => { if (ok) setSessao(j as Sessao); setChecando(false) })
  }, [])

  if (checando) return <div className="min-h-screen grid place-items-center bg-[#faf9f5] text-[#15153f]/50">carregando…</div>
  if (!sessao) return <Login onLogin={setSessao} />
  return <Painel sessao={sessao} onLogout={() => setSessao(null)} />
}

// ---------------------------------------------------------------- LOGIN
function Login({ onLogin }: { onLogin: (s: Sessao) => void }) {
  const [modo, setModo] = useState<'pin' | 'dono'>('pin')
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [master, setMaster] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    setErro(''); setCarregando(true)
    const body = modo === 'dono' ? { master } : { nome, pin }
    const { ok, j } = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(body) })
    setCarregando(false)
    if (ok) onLogin(j as Sessao); else setErro((j.error as string) || 'falha no login')
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#faf9f5] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-[#15153f]/10 p-7 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ultra.png" alt="Ultra 3D Brasil" className="h-11 mx-auto mb-5" />
        <h1 className="serif text-2xl font-semibold text-[#15153f]">Painel / PDV</h1>
        <p className="text-sm text-[#15153f]/55 mt-1 mb-5">{modo === 'dono' ? 'Acesso do dono' : 'Entre com seu nome e PIN'}</p>

        {modo === 'pin' ? (
          <>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
              className="w-full rounded-lg border border-[#15153f]/15 px-4 py-2.5 mb-3 outline-none focus:border-[#C9A86A]" />
            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} type="password"
              onKeyDown={e => e.key === 'Enter' && entrar()} placeholder="PIN"
              className="w-full rounded-lg border border-[#15153f]/15 px-4 py-2.5 mb-3 outline-none focus:border-[#C9A86A] tracking-[0.4em] text-center" />
          </>
        ) : (
          <input value={master} onChange={e => setMaster(e.target.value)} type="password" onKeyDown={e => e.key === 'Enter' && entrar()}
            placeholder="Senha mestra" className="w-full rounded-lg border border-[#15153f]/15 px-4 py-2.5 mb-3 outline-none focus:border-[#C9A86A]" />
        )}

        <button onClick={entrar} disabled={carregando} className="w-full rounded-lg bg-[#15153f] text-white font-bold py-2.5 hover:bg-[#333389] transition disabled:opacity-50">
          {carregando ? 'entrando…' : 'Entrar'}
        </button>
        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}
        <button onClick={() => { setModo(modo === 'pin' ? 'dono' : 'pin'); setErro('') }} className="mt-4 text-xs font-semibold text-[#333389]">
          {modo === 'pin' ? 'Sou o dono (senha mestra)' : '← Voltar pro login por PIN'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- PAINEL
function Painel({ sessao, onLogout }: { sessao: Sessao; onLogout: () => void }) {
  const dono = sessao.papel === 'dono'
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [impressoras, setImpressoras] = useState<Impressora[]>([])
  const [gerImpressoras, setGerImpressoras] = useState(false)
  const [cfgCusto, setCfgCusto] = useState<ConfigCustos | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fOrigem, setFOrigem] = useState('')
  const [novo, setNovo] = useState(false)
  const [editar, setEditar] = useState<Pedido | null>(null)
  const [equipe, setEquipe] = useState(false)
  const [cobrarId, setCobrarId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [aba, setAba] = useState<'pedidos' | 'fila' | 'custos' | 'estoque'>('pedidos')

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    const qs = new URLSearchParams()
    if (fStatus) qs.set('status', fStatus)
    if (fOrigem) qs.set('origem', fOrigem)
    const { ok, j } = await api('/api/admin/pedidos?' + qs)
    if (ok) setPedidos(j.pedidos as Pedido[]); else setErro((j.error as string) || 'erro')
    setLoading(false)
  }, [fStatus, fOrigem])

  const carregarImpressoras = useCallback(async () => {
    const { ok, j } = await api('/api/admin/impressoras')
    if (ok) setImpressoras(j.impressoras as Impressora[])
  }, [])

  useEffect(() => {
    carregar()
    carregarImpressoras()
    api('/api/admin/config-custos').then(({ ok, j }) => { if (ok) setCfgCusto(j.config as ConfigCustos) })
    supabase.from('produtos').select('*').eq('ativo', true).order('nome').then(({ data }) => setProdutos((data ?? []) as Produto[]))
  }, [carregar, carregarImpressoras])

  async function mudarImpressora(id: string, impressora: string) {
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, impressora } : p))
    await api('/api/admin/pedidos/' + id, { method: 'PATCH', body: JSON.stringify({ impressora }) })
  }
  const impAtivas = impressoras.filter(i => i.ativo)

  async function sair() { await api('/api/admin/me', { method: 'DELETE' }); onLogout() }
  async function mudarStatus(id: string, status: string) {
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    await api('/api/admin/pedidos/' + id, { method: 'PATCH', body: JSON.stringify({ status }) })
  }
  async function apagar(id: string) {
    if (!confirm('Apagar este pedido?')) return
    const { ok, j } = await api('/api/admin/pedidos/' + id, { method: 'DELETE' })
    if (ok) setPedidos(ps => ps.filter(p => p.id !== id)); else alert((j.error as string) || 'erro')
  }
  async function baixarEstoque(p: Pedido) {
    if (!confirm(`Dar baixa no estoque do pedido #${p.codigo}? (só uma vez)`)) return
    const { ok, j } = await api('/api/admin/pedidos/' + p.id + '/baixar-estoque', { method: 'POST' })
    if (!ok) { alert((j.error as string) || 'erro'); return }
    const linhas = (j.baixados as { nome: string; usou: number; restou: number }[]).map(b => `• ${b.nome}: −${b.usou} (restam ${b.restou})`).join('\n')
    alert('Estoque baixado:\n\n' + linhas)
    setPedidos(ps => ps.map(x => x.id === p.id ? { ...x, estoque_baixado: true } : x))
  }

  const metricas = useMemo(() => {
    const pagos = pedidos.filter(p => ['pago', 'em_producao', 'enviado', 'entregue'].includes(p.status))
    const receita = pagos.reduce((s, p) => s + Number(p.total), 0)
    const aguardando = pedidos.filter(p => p.status === 'aguardando_pagamento').length
    const produzir = pedidos.filter(p => ['pago', 'em_producao'].includes(p.status)).length
    return { receita, aguardando, produzir, total: pedidos.length }
  }, [pedidos])

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#15153f]/10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ultra.png" alt="" className="h-8" />
            <span className="serif text-xl font-semibold text-[#15153f] hidden sm:inline">Painel / PDV</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#15153f]/55 hidden sm:inline">{sessao.nome}{dono ? ' · dono' : ''}</span>
            {dono && <button onClick={() => setEquipe(true)} className="rounded-full border border-[#15153f]/15 bg-white px-3 py-2 text-sm font-semibold hover:border-[#C9A86A]">Equipe</button>}
            <button onClick={() => setNovo(true)} className="rounded-full bg-[#C9A86A] text-[#15153f] font-bold px-4 py-2 text-sm hover:bg-[#b8955a] transition">+ Pedido</button>
            <button onClick={sair} className="text-xs text-[#15153f]/45 hover:text-red-600 px-1">sair</button>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-5 pt-4">
        <div className="inline-flex rounded-full bg-white border border-[#15153f]/10 p-1 gap-1">
          {([['pedidos', 'Pedidos'], ['fila', 'Fila de produção'], ['custos', 'Custos'], ['estoque', 'Estoque']] as [string, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setAba(v as typeof aba)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${aba === v ? 'bg-[#15153f] text-white' : 'text-[#15153f]/60 hover:text-[#333389]'}`}>{label}</button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {aba === 'fila' && <Fila pedidos={pedidos} onStatus={mudarStatus} onReload={carregar} loading={loading} impressoras={impAtivas} onImpressora={mudarImpressora} onGerenciar={dono ? () => setGerImpressoras(true) : undefined} cfg={cfgCusto} />}
        {aba === 'custos' && <Custos />}
        {aba === 'estoque' && <Estoque dono={dono} />}
        {aba === 'pedidos' && <>
        <div className={`grid grid-cols-2 ${dono ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 mb-6`}>
          {dono && <CardM titulo="Receita (pagos)" valor={brl(metricas.receita)} />}
          <CardM titulo="A produzir" valor={String(metricas.produzir)} />
          <CardM titulo="Aguardando pgto" valor={String(metricas.aguardando)} />
          <CardM titulo="Total de pedidos" valor={String(metricas.total)} />
        </div>

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
          <button onClick={carregar} className="rounded-lg border border-[#15153f]/15 bg-white px-3 py-2 text-sm font-semibold hover:border-[#C9A86A]">Atualizar</button>
          {loading && <span className="text-sm text-[#15153f]/50">carregando…</span>}
          {erro && <span className="text-sm text-red-600">{erro}</span>}
        </div>

        <div className="space-y-3">
          {pedidos.map(p => {
            const si = statusInfo(p.status)
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-[#15153f]/8 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {p.imagens?.[0] && (
                      <button onClick={() => setZoom(p.imagens![0])} className="relative shrink-0" title="ver foto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imagens[0]} alt="" className="h-16 w-16 object-cover rounded-lg border border-[#15153f]/10 cursor-zoom-in" />
                        {p.imagens.length > 1 && <span className="absolute -bottom-1 -right-1 bg-[#15153f] text-white text-[10px] font-bold rounded-full px-1.5">+{p.imagens.length - 1}</span>}
                      </button>
                    )}
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
                    {impAtivas.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <span title="impressora">🖨️</span>
                        <select value={p.impressora ?? ''} onChange={e => mudarImpressora(p.id, e.target.value)}
                          className="rounded border border-[#15153f]/12 px-2 py-1 bg-white text-[#15153f]/80">
                          <option value="">— impressora —</option>
                          {impAtivas.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="serif text-xl font-bold text-[#333389]">{brl(p.total)}</div>
                    {Number(p.frete) > 0 && <div className="text-[11px] text-[#15153f]/45">frete {brl(p.frete)}</div>}
                    {Number(p.desconto) > 0 && <div className="text-[11px] text-[#2f855a]">desconto −{brl(p.desconto)}</div>}
                    {(() => { const c = custoPedido(cfgCusto, p, impressoras); if (c <= 0) return null
                      const m = Number(p.total) > 0 ? ((Number(p.total) - c) / Number(p.total)) * 100 : null
                      return <div className="text-[11px] text-[#15153f]/55 mt-0.5">custo {brl(c)}{m != null && <span className="font-semibold" style={{ color: m < 40 ? '#c53030' : m < 60 ? '#b7791f' : '#2f855a' }}> · margem {m.toFixed(0)}%</span>}</div>
                    })()}
                    <select value={p.status} onChange={e => mudarStatus(p.id, e.target.value)}
                      className="mt-2 rounded-full text-xs font-bold px-3 py-1.5 text-white border-0 cursor-pointer" style={{ background: si.cor }}>
                      {STATUS.map(s => <option key={s.v} value={s.v} style={{ background: '#fff', color: '#15153f' }}>{s.label}</option>)}
                    </select>
                    <div className="flex items-center gap-3 justify-end mt-2 flex-wrap">
                      {p.itens_pedido?.some(it => (it.consumo?.length ?? 0) > 0) && (
                        p.estoque_baixado
                          ? <span className="text-[11px] text-[#2f855a] font-bold">📦 estoque baixado ✓</span>
                          : <button onClick={() => baixarEstoque(p)} className="text-xs font-bold text-[#805ad5] hover:underline">📦 Baixar estoque</button>
                      )}
                      <button onClick={() => setEditar(p)} className="text-xs font-bold text-[#15153f]/70 hover:text-[#333389]">✏️ editar</button>
                      {p.status !== 'pago' && p.status !== 'entregue' && (
                        <button onClick={() => setCobrarId(cobrarId === p.id ? null : p.id)} className="text-xs font-bold text-[#333389] hover:underline">💳 Cobrança</button>
                      )}
                      {dono && <button onClick={() => apagar(p.id)} className="text-[11px] text-[#15153f]/40 hover:text-red-600">apagar</button>}
                    </div>
                  </div>
                </div>
                {cobrarId === p.id && <CobrancaBox pedido={p} />}
                {['pago', 'em_producao', 'enviado'].includes(p.status) && p.cep && <EtiquetaBox pedido={p} />}
              </div>
            )
          })}
          {!loading && !pedidos.length && <p className="text-center text-[#15153f]/45 py-16">Nenhum pedido ainda.</p>}
        </div>
        </>}
      </main>

      {novo && <NovoPedido produtos={produtos} impressoras={impAtivas} onClose={() => setNovo(false)} onSalvo={() => { setNovo(false); carregar() }} />}
      {editar && <NovoPedido produtos={produtos} impressoras={impAtivas} pedido={editar} onClose={() => setEditar(null)} onSalvo={() => { setEditar(null); carregar() }} />}
      {equipe && <Equipe onClose={() => setEquipe(false)} />}
      {gerImpressoras && <ImpressorasModal onClose={() => { setGerImpressoras(false); carregarImpressoras() }} />}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-w-full max-h-full rounded-2xl" />
          <button aria-label="Fechar" className="absolute top-4 right-6 text-white text-4xl leading-none">×</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- IMPRESSORAS (só dono)
function ImpressorasModal({ onClose }: { onClose: () => void }) {
  const [lista, setLista] = useState<Impressora[]>([])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('resina')
  const [custoH, setCustoH] = useState(1)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => { const { ok, j } = await api('/api/admin/impressoras'); if (ok) setLista(j.impressoras as Impressora[]) }, [])
  useEffect(() => { carregar() }, [carregar])

  async function add() {
    setErro('')
    if (nome.trim().length < 2) { setErro('nome muito curto'); return }
    const { ok, j } = await api('/api/admin/impressoras', { method: 'POST', body: JSON.stringify({ nome, tipo, custo_hora: custoH }) })
    if (!ok) { setErro((j.error as string) || 'erro'); return }
    setNome(''); setCustoH(1); carregar()
  }
  function setLocal(id: string, patch: Partial<Impressora>) { setLista(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)) }
  async function toggle(i: Impressora) { await api('/api/admin/impressoras/' + i.id, { method: 'PATCH', body: JSON.stringify({ ativo: !i.ativo }) }); carregar() }
  async function remover(i: Impressora) { if (!confirm('Remover ' + i.nome + '?')) return; await api('/api/admin/impressoras/' + i.id, { method: 'DELETE' }); carregar() }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[#faf9f5] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#faf9f5] px-5 pt-5 pb-3 border-b border-[#15153f]/10 flex items-center justify-between">
          <h2 className="serif text-xl font-semibold text-[#15153f]">Impressoras</h2>
          <button onClick={onClose} className="text-2xl text-[#15153f]/40 leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-white border border-[#15153f]/10 p-3 flex flex-wrap gap-2">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome (ex.: Bambu P1S)" className="flex-1 min-w-[120px] rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
              <option value="resina">Resina</option><option value="fdm">FDM</option>
            </select>
            <label className="flex items-center gap-1 text-sm text-[#15153f]/70">R$/h <input type="number" step="0.01" value={custoH} onChange={e => setCustoH(+e.target.value)} className="w-20 rounded-lg border border-[#15153f]/15 px-2 py-2 text-right" /></label>
            <button onClick={add} className="rounded-full bg-[#15153f] text-white font-bold px-5 py-2 text-sm hover:bg-[#333389]">Adicionar</button>
            {erro && <p className="w-full text-sm text-red-600">{erro}</p>}
          </div>
          <div className="space-y-2">
            {lista.map(i => (
              <div key={i.id} className={`flex items-center justify-between rounded-xl bg-white border border-[#15153f]/10 p-3 ${i.ativo ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#15153f]">{i.nome}</span> {i.tipo && <span className="text-[10px] font-bold text-[#C9A86A] uppercase">{i.tipo}</span>}
                  <label className="flex items-center gap-1 text-xs text-[#15153f]/60">R$/h <input type="number" step="0.01" value={i.custo_hora ?? 1} onChange={e => setLocal(i.id, { custo_hora: +e.target.value })} onBlur={e => api('/api/admin/impressoras/' + i.id, { method: 'PATCH', body: JSON.stringify({ custo_hora: +e.target.value }) })} className="w-16 rounded border border-[#15153f]/10 px-1.5 py-1 text-right" /></label>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button onClick={() => toggle(i)} className="text-[#15153f]/60">{i.ativo ? 'desativar' : 'ativar'}</button>
                  <button onClick={() => remover(i)} className="text-[#15153f]/40 hover:text-red-600">remover</button>
                </div>
              </div>
            ))}
            {!lista.length && <p className="text-center text-sm text-[#15153f]/40 py-4">Nenhuma impressora.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function CardM({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#15153f]/8 p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#15153f]/45 font-semibold">{titulo}</div>
      <div className="serif text-2xl font-bold text-[#15153f] mt-1">{valor}</div>
    </div>
  )
}

// ---------------------------------------------------------------- FILA DE PRODUÇÃO
function Fila({ pedidos, onStatus, onReload, loading, impressoras, onImpressora, onGerenciar, cfg }: {
  pedidos: Pedido[]; onStatus: (id: string, s: string) => void; onReload: () => void; loading: boolean
  impressoras: Impressora[]; onImpressora: (id: string, nome: string) => void; onGerenciar?: () => void; cfg: ConfigCustos | null
}) {
  const colunas: { status: string; titulo: string; cor: string; proximo?: string; acao?: string }[] = [
    { status: 'pago', titulo: 'A produzir', cor: '#2f855a', proximo: 'em_producao', acao: '▶ Iniciar' },
    { status: 'em_producao', titulo: 'Em produção', cor: '#3182ce', proximo: 'enviado', acao: '✓ Pronto / enviar' },
    { status: 'enviado', titulo: 'Pronto / enviado', cor: '#805ad5', proximo: 'entregue', acao: '✓ Entregue' },
  ]
  const fifo = (s: string) => pedidos.filter(p => p.status === s).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
  const totalPecas = (p: Pedido) => (p.itens_pedido ?? []).reduce((s, i) => s + i.quantidade, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-[#15153f]/55">Ordem de chegada (mais antigo primeiro). Avance com os botões.</p>
        <div className="flex items-center gap-2">
          {onGerenciar && <button onClick={onGerenciar} className="rounded-lg border border-[#15153f]/15 bg-white px-3 py-2 text-sm font-semibold hover:border-[#C9A86A]">🖨️ Impressoras</button>}
          <button onClick={onReload} className="rounded-lg border border-[#15153f]/15 bg-white px-3 py-2 text-sm font-semibold hover:border-[#C9A86A]">Atualizar</button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {colunas.map(col => {
          const lista = fifo(col.status)
          return (
            <div key={col.status} className="rounded-2xl bg-[#15153f]/[0.03] border border-[#15153f]/8 p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-bold text-sm" style={{ color: col.cor }}>{col.titulo}</span>
                <span className="text-xs font-bold text-white rounded-full px-2 py-0.5" style={{ background: col.cor }}>{lista.length}</span>
              </div>
              <div className="space-y-2">
                {lista.map((p, i) => (
                  <div key={p.id} className="rounded-xl bg-white border border-[#15153f]/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#15153f] text-sm">#{p.codigo} <span className="text-[#15153f]/40 font-normal">· {i + 1}º</span></span>
                      <span className="text-[11px] text-[#15153f]/45">{fmtData(p.created_at)}</span>
                    </div>
                    <div className="text-xs text-[#15153f]/60">{p.cliente_nome || 'Cliente'} · {totalPecas(p)} {totalPecas(p) === 1 ? 'peça' : 'peças'}{custoPedido(cfg, p, impressoras) > 0 && <span> · custo {brl(custoPedido(cfg, p, impressoras))}</span>}</div>
                    <div className="flex gap-2 mt-1.5">
                      {p.imagens?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagens[0]} alt="" onClick={() => window.open(p.imagens![0], '_blank')} className="h-20 w-20 object-cover rounded-lg border border-[#15153f]/10 cursor-zoom-in shrink-0" />
                      )}
                      <ul className="text-sm text-[#15153f]/80 space-y-0.5">
                        {p.itens_pedido?.map(it => <li key={it.id}>{it.quantidade}× {it.descricao}</li>)}
                      </ul>
                    </div>
                    {impressoras.length > 0 && (
                      <select value={p.impressora ?? ''} onChange={e => onImpressora(p.id, e.target.value)}
                        className="mt-2 w-full rounded border border-[#15153f]/12 px-2 py-1.5 bg-white text-xs text-[#15153f]/80">
                        <option value="">🖨️ escolher impressora</option>
                        {impressoras.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
                      </select>
                    )}
                    {col.proximo && (
                      <button onClick={() => onStatus(p.id, col.proximo!)}
                        className="mt-2 w-full rounded-full text-white font-bold text-xs py-1.5 hover:opacity-90 transition" style={{ background: col.cor }}>
                        {col.acao}
                      </button>
                    )}
                  </div>
                ))}
                {!lista.length && <p className="text-center text-xs text-[#15153f]/35 py-6">{loading ? '…' : 'vazio'}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- CUSTOS
type ConfigCustos = { filamento_kg: number; energia_kwh: number; potencia_w: number; falha_pct: number; maquina_hora: number; mao_obra_hora: number; markup: number }

/** custo de impressão a partir de peso (g) e tempo (h). maqHora = R$/h da máquina (por impressora). */
function calcularCusto(cfg: ConfigCustos | null, pesoG: number, tempoH: number, maqHora?: number): number {
  if (!cfg) return 0
  const maq = maqHora != null ? Number(maqHora) : Number(cfg.maquina_hora || 0)
  const mat = (Number(pesoG) || 0) / 1000 * Number(cfg.filamento_kg)
  const energia = (Number(tempoH) || 0) * Number(cfg.potencia_w) / 1000 * Number(cfg.energia_kwh)
  const trabalho = (Number(tempoH) || 0) * (maq + Number(cfg.mao_obra_hora || 0))
  return (mat + energia + trabalho) * (1 + Number(cfg.falha_pct) / 100)
}
/** custo de UM item (por unidade): impressão + consumo de estoque. Consumo tem prioridade sobre peso (não duplica material). */
function custoItem(cfg: ConfigCustos | null, it: Item, maqHora?: number): number {
  const consumo = (it.consumo ?? []).reduce((s, c) => s + Number(c.quantidade) * Number(c.custo_unit), 0)
  const peso = (it.consumo ?? []).length > 0 ? 0 : (it.peso_g ?? 0)
  return calcularCusto(cfg, peso, it.tempo_h ?? 0, maqHora) + consumo
}
/** custo total de produção do pedido (usa o R$/h da impressora do pedido). */
function custoPedido(cfg: ConfigCustos | null, p: { itens_pedido: Item[]; impressora?: string | null }, impressoras?: Impressora[]): number {
  const maq = impressoras?.find(i => i.nome === p.impressora)?.custo_hora
  return (p.itens_pedido ?? []).reduce((s, it) => s + custoItem(cfg, it, maq) * Number(it.quantidade), 0)
}

function Custos() {
  const [cfg, setCfg] = useState<ConfigCustos | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const [{ ok, j }, prod] = await Promise.all([
      api('/api/admin/config-custos'),
      supabase.from('produtos').select('*').order('nome'),
    ])
    if (ok) setCfg(j.config as ConfigCustos)
    setProdutos((prod.data ?? []) as Produto[])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const calcCusto = (p: Produto) => calcularCusto(cfg, Number(p.peso_g), Number(p.tempo_impressao_h))
  const sugerido = (p: Produto) => cfg ? Math.max(1, Math.round(calcCusto(p) * Number(cfg.markup))) : 0
  const margem = (p: Produto) => { const c = calcCusto(p); return c > 0 ? ((Number(p.preco) - c) / Number(p.preco)) * 100 : 0 }

  async function salvarCfg() {
    if (!cfg) return
    setSalvandoCfg(true); setMsg('')
    const { ok } = await api('/api/admin/config-custos', { method: 'PATCH', body: JSON.stringify(cfg) })
    setSalvandoCfg(false); setMsg(ok ? 'parâmetros salvos' : 'erro ao salvar')
    setTimeout(() => setMsg(''), 2500)
  }
  function setLocal(id: string, patch: Partial<Produto>) { setProdutos(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)) }
  async function updProduto(id: string, patch: Partial<Produto>) {
    setLocal(id, patch)
    await api('/api/admin/produtos/' + id, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  function usarSugerido(p: Produto) { updProduto(p.id, { preco: sugerido(p) } as Partial<Produto>) }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? produtos.filter(p => p.nome.toLowerCase().includes(q)) : produtos
  }, [busca, produtos])

  const campoCfg = (k: keyof ConfigCustos, label: string, step = '0.01') => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[#15153f]/55">{label}</span>
      <input type="number" step={step} value={cfg?.[k] ?? 0} onChange={e => setCfg(c => c ? { ...c, [k]: +e.target.value } : c)}
        className="w-full rounded-lg border border-[#15153f]/15 px-2 py-1.5 text-sm outline-none focus:border-[#C9A86A]" />
    </label>
  )

  if (!cfg) return <p className="text-[#15153f]/45 py-10 text-center">carregando…</p>

  return (
    <div>
      <div className="rounded-2xl bg-white border border-[#15153f]/8 p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="serif text-lg font-semibold text-[#15153f]">Parâmetros de custo</h3>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs text-[#2f855a] font-semibold">{msg}</span>}
            <button onClick={salvarCfg} disabled={salvandoCfg} className="rounded-full bg-[#15153f] text-white font-bold px-4 py-1.5 text-sm hover:bg-[#333389] disabled:opacity-50">Salvar</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {campoCfg('filamento_kg', 'Material R$/kg')}
          {campoCfg('maquina_hora', 'Máquina R$/h')}
          {campoCfg('mao_obra_hora', 'Mão de obra R$/h')}
          {campoCfg('energia_kwh', 'Energia R$/kWh', '0.0001')}
          {campoCfg('potencia_w', 'Potência (W)', '1')}
          {campoCfg('falha_pct', 'Falhas (%)', '0.5')}
          {campoCfg('markup', 'Markup (×)', '0.1')}
        </div>
        <p className="text-xs text-[#15153f]/45 mt-2">Custo = material (peso × R$/kg) + <b>tempo × (máquina + mão de obra)</b> + energia, + % de falhas. Preço sugerido = custo × markup. <b>Máquina R$/h</b> aqui é o padrão; cada impressora pode ter o seu (Fila → 🖨️ Impressoras) e o pedido usa o da máquina escolhida. Ex.: Bambu ~R$1, SnapMaker R$2,50.</p>
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto…"
        className="w-full sm:w-72 rounded-lg border border-[#15153f]/15 px-3 py-2 mb-3 outline-none focus:border-[#C9A86A]" />

      <div className="overflow-x-auto rounded-2xl border border-[#15153f]/8 bg-white">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#15153f]/45 border-b border-[#15153f]/8">
              <th className="p-3">Produto</th>
              <th className="p-3 w-24">Peso (g)</th>
              <th className="p-3 w-24">Tempo (h)</th>
              <th className="p-3 w-24">Custo</th>
              <th className="p-3 w-28">Preço</th>
              <th className="p-3 w-20">Margem</th>
              <th className="p-3 w-28">Sugerido</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const m = margem(p)
              return (
                <tr key={p.id} className="border-b border-[#15153f]/5 hover:bg-[#faf9f5]">
                  <td className="p-3 font-semibold text-[#15153f]">{p.nome}</td>
                  <td className="p-3">
                    <input type="number" min={0} value={p.peso_g ?? 0} onChange={e => setLocal(p.id, { peso_g: +e.target.value })} onBlur={e => updProduto(p.id, { peso_g: +e.target.value })}
                      className="w-20 rounded border border-[#15153f]/10 px-2 py-1 text-right" />
                  </td>
                  <td className="p-3">
                    <input type="number" min={0} step="0.1" value={p.tempo_impressao_h ?? 0} onChange={e => setLocal(p.id, { tempo_impressao_h: +e.target.value } as Partial<Produto>)} onBlur={e => updProduto(p.id, { tempo_impressao_h: +e.target.value } as Partial<Produto>)}
                      className="w-20 rounded border border-[#15153f]/10 px-2 py-1 text-right" />
                  </td>
                  <td className="p-3 text-[#15153f]/70">{brl(calcCusto(p))}</td>
                  <td className="p-3">
                    <input type="number" min={0} step="0.01" value={p.preco} onChange={e => setLocal(p.id, { preco: +e.target.value })} onBlur={e => updProduto(p.id, { preco: +e.target.value })}
                      className="w-24 rounded border border-[#15153f]/10 px-2 py-1 text-right font-semibold text-[#333389]" />
                  </td>
                  <td className="p-3 font-bold" style={{ color: m < 40 ? '#c53030' : m < 60 ? '#b7791f' : '#2f855a' }}>{m.toFixed(0)}%</td>
                  <td className="p-3">
                    <button onClick={() => usarSugerido(p)} className="text-xs font-bold text-[#333389] hover:underline whitespace-nowrap">{brl(sugerido(p))} →</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#15153f]/45 mt-2">Editar peso/tempo/preço salva na hora. “Sugerido” aplica o preço calculado ao produto.</p>
    </div>
  )
}

// ---------------------------------------------------------------- ETIQUETA (Melhor Envio)
function EtiquetaBox({ pedido }: { pedido: Pedido }) {
  const [url, setUrl] = useState<string | null>(pedido.frete_etiqueta_url)
  const [rastreio, setRastreio] = useState<string | null>(pedido.frete_rastreio)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setGerando(true); setErro('')
    const { ok, j } = await api(`/api/admin/pedidos/${pedido.id}/etiqueta`, { method: 'POST' })
    setGerando(false)
    if (!ok) { setErro((j.error as string) || 'falha'); return }
    setUrl(j.etiqueta_url as string); setRastreio((j.rastreio as string) || null)
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#15153f]/10 text-sm flex flex-wrap items-center gap-3">
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-[#805ad5] text-white font-bold px-4 py-1.5 text-xs">📄 Etiqueta (PDF)</a>
          {rastreio && <span className="text-xs text-[#15153f]/60">rastreio: <b>{rastreio}</b></span>}
        </>
      ) : (
        <button onClick={gerar} disabled={gerando} className="rounded-full border border-[#805ad5] text-[#805ad5] font-bold px-4 py-1.5 text-xs hover:bg-[#805ad5]/10 disabled:opacity-50">
          {gerando ? 'gerando etiqueta…' : '🏷️ Gerar etiqueta Melhor Envio'}
        </button>
      )}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  )
}

// ---------------------------------------------------------------- ESTOQUE
type Insumo = { id: string; nome: string; categoria: string | null; unidade: string; quantidade: number; minimo: number; custo_unit: number; obs: string | null; ativo: boolean }
const CATEGORIAS = ['Filamento', 'Resina', 'Componentes', 'Embalagem', 'Outros']
const UNIDADES = ['un', 'kg', 'g', 'm', 'L', 'ml']

function Estoque({ dono }: { dono: boolean }) {
  const [itens, setItens] = useState<Insumo[]>([])
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState({ nome: '', categoria: 'Filamento', unidade: 'kg', quantidade: 0, minimo: 0, custo_unit: 0 })
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => { const { ok, j } = await api('/api/admin/estoque'); if (ok) setItens(j.itens as Insumo[]) }, [])
  useEffect(() => { carregar() }, [carregar])

  function setLocal(id: string, patch: Partial<Insumo>) { setItens(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)) }
  async function upd(id: string, patch: Record<string, unknown>) { await api('/api/admin/estoque/' + id, { method: 'PATCH', body: JSON.stringify(patch) }) }
  async function ajustar(it: Insumo, delta: number) {
    const q = Math.max(0, Number(it.quantidade) + delta)
    setLocal(it.id, { quantidade: q }); await upd(it.id, { quantidade: q })
  }
  async function remover(it: Insumo) { if (!confirm('Remover ' + it.nome + '?')) return; await api('/api/admin/estoque/' + it.id, { method: 'DELETE' }); carregar() }
  async function add() {
    setErro('')
    if (!novo.nome.trim()) { setErro('informe o nome'); return }
    const { ok, j } = await api('/api/admin/estoque', { method: 'POST', body: JSON.stringify(novo) })
    if (!ok) { setErro((j.error as string) || 'erro'); return }
    setNovo({ nome: '', categoria: novo.categoria, unidade: novo.unidade, quantidade: 0, minimo: 0, custo_unit: 0 }); carregar()
  }

  const filtrados = useMemo(() => { const q = busca.trim().toLowerCase(); return q ? itens.filter(i => i.nome.toLowerCase().includes(q)) : itens }, [busca, itens])
  const baixos = itens.filter(i => Number(i.quantidade) <= Number(i.minimo))
  const cats = [...new Set(filtrados.map(i => i.categoria || 'Outros'))]
  const step = (u: string) => (u === 'kg' || u === 'L' ? 0.5 : u === 'g' || u === 'ml' ? 50 : 1)

  return (
    <div>
      {/* alerta de baixo estoque */}
      {baixos.length > 0 && (
        <div className="rounded-xl bg-[#c53030]/8 border border-[#c53030]/20 p-3 mb-4 text-sm text-[#c53030]">
          ⚠️ <b>{baixos.length}</b> {baixos.length === 1 ? 'insumo abaixo' : 'insumos abaixo'} do mínimo: {baixos.map(b => b.nome).join(', ')}
        </div>
      )}

      {/* adicionar */}
      <div className="rounded-2xl bg-white border border-[#15153f]/8 p-4 mb-5">
        <div className="text-xs font-semibold text-[#15153f]/60 mb-2">Adicionar insumo</div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome (ex.: PLA Branco Fosco)" className="col-span-2 rounded-lg border border-[#15153f]/15 px-3 py-2 text-sm outline-none focus:border-[#C9A86A]" />
          <select value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} className="rounded-lg border border-[#15153f]/15 px-2 py-2 text-sm bg-white">{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select>
          <select value={novo.unidade} onChange={e => setNovo({ ...novo, unidade: e.target.value })} className="rounded-lg border border-[#15153f]/15 px-2 py-2 text-sm bg-white">{UNIDADES.map(u => <option key={u}>{u}</option>)}</select>
          <input type="number" step="0.0001" value={novo.custo_unit} onChange={e => setNovo({ ...novo, custo_unit: +e.target.value })} placeholder="R$/un" title="custo por unidade" className="rounded-lg border border-[#15153f]/15 px-2 py-2 text-sm text-right" />
          <button onClick={add} className="rounded-full bg-[#15153f] text-white font-bold px-4 py-2 text-sm hover:bg-[#333389]">Adicionar</button>
        </div>
        {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar insumo…" className="w-full sm:w-72 rounded-lg border border-[#15153f]/15 px-3 py-2 mb-3 outline-none focus:border-[#C9A86A]" />

      {cats.map(cat => (
        <div key={cat} className="mb-5">
          <h3 className="serif text-lg font-semibold text-[#15153f] mb-2">{cat}</h3>
          <div className="overflow-x-auto rounded-2xl border border-[#15153f]/8 bg-white">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[#15153f]/45 border-b border-[#15153f]/8">
                <th className="p-3">Insumo</th><th className="p-3 w-44 text-center">Quantidade</th><th className="p-3 w-24">Mínimo</th><th className="p-3 w-24">R$/un</th><th className="p-3 w-16"></th>
              </tr></thead>
              <tbody>
                {filtrados.filter(i => (i.categoria || 'Outros') === cat).map(it => {
                  const baixo = Number(it.quantidade) <= Number(it.minimo)
                  return (
                    <tr key={it.id} className="border-b border-[#15153f]/5 hover:bg-[#faf9f5]">
                      <td className="p-3 font-semibold text-[#15153f]">{it.nome}{baixo && <span className="ml-2 text-[10px] font-bold text-[#c53030]">BAIXO</span>}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => ajustar(it, -step(it.unidade))} className="h-7 w-7 rounded-lg bg-[#faf9f5] border border-[#15153f]/10 font-bold">−</button>
                          <input type="number" step="0.01" value={it.quantidade} onChange={e => setLocal(it.id, { quantidade: +e.target.value })} onBlur={e => upd(it.id, { quantidade: +e.target.value })}
                            className={`w-20 text-center rounded border px-2 py-1 ${baixo ? 'border-[#c53030] text-[#c53030] font-bold' : 'border-[#15153f]/10'}`} />
                          <button onClick={() => ajustar(it, step(it.unidade))} className="h-7 w-7 rounded-lg bg-[#faf9f5] border border-[#15153f]/10 font-bold">+</button>
                          <span className="text-xs text-[#15153f]/45 w-6">{it.unidade}</span>
                        </div>
                      </td>
                      <td className="p-3"><input type="number" step="0.01" value={it.minimo} onChange={e => setLocal(it.id, { minimo: +e.target.value })} onBlur={e => upd(it.id, { minimo: +e.target.value })} className="w-20 rounded border border-[#15153f]/10 px-2 py-1 text-right" /></td>
                      <td className="p-3"><input type="number" step="0.0001" value={it.custo_unit} onChange={e => setLocal(it.id, { custo_unit: +e.target.value })} onBlur={e => upd(it.id, { custo_unit: +e.target.value })} className="w-20 rounded border border-[#15153f]/10 px-2 py-1 text-right" /></td>
                      <td className="p-3 text-right">{dono && <button onClick={() => remover(it)} className="text-[11px] text-[#15153f]/40 hover:text-red-600">remover</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {!itens.length && <p className="text-center text-[#15153f]/45 py-10">Nenhum insumo. Adicione acima.</p>}
      <p className="text-xs text-[#15153f]/45 mt-1">− e + ajustam a quantidade (entrada/saída). Editar quantidade/mínimo/custo salva ao sair do campo.</p>
    </div>
  )
}

// ---------------------------------------------------------------- COBRANÇA
function CobrancaBox({ pedido }: { pedido: Pedido }) {
  const [forma, setForma] = useState<'pix' | 'boleto' | 'cartao'>('pix')
  const [cpf, setCpf] = useState(pedido.cliente_cpf || '')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [res, setRes] = useState<{ invoiceUrl: string | null; pix?: { base64: string; copiaCola: string } | null; boleto?: { url: string | null; linhaDigitavel: string | null } | null } | null>(null)

  async function gerar() {
    setGerando(true); setErro(''); setRes(null)
    const { ok, j } = await api(`/api/admin/pedidos/${pedido.id}/cobranca`, { method: 'POST', body: JSON.stringify({ forma, cliente_cpf: cpf || undefined }) })
    setGerando(false)
    if (!ok) { setErro((j.error as string) || 'falha'); return }
    setRes(j as typeof res)
  }
  const copiar = (t: string) => navigator.clipboard?.writeText(t)

  return (
    <div className="mt-3 pt-3 border-t border-[#15153f]/10">
      {!res && (
        <div className="flex flex-wrap items-end gap-2">
          <select value={forma} onChange={e => setForma(e.target.value as 'pix' | 'boleto' | 'cartao')} className="rounded-lg border border-[#15153f]/15 px-3 py-2 text-sm bg-white">
            <option value="pix">Pix</option><option value="boleto">Boleto</option><option value="cartao">Cartão (link)</option>
          </select>
          <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF/CNPJ do cliente"
            className="rounded-lg border border-[#15153f]/15 px-3 py-2 text-sm outline-none focus:border-[#C9A86A]" />
          <button onClick={gerar} disabled={gerando} className="rounded-full bg-[#333389] text-white font-bold px-5 py-2 text-sm hover:bg-[#15153f] disabled:opacity-50">
            {gerando ? 'gerando…' : 'Gerar cobrança'}
          </button>
          {erro && <span className="text-sm text-red-600">{erro}</span>}
        </div>
      )}
      {res && (
        <div className="text-sm space-y-2">
          {res.pix?.copiaCola && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {res.pix.base64 && <img src={`data:image/png;base64,${res.pix.base64}`} alt="QR Pix" className="h-28 w-28 rounded-lg border" />}
              <div className="min-w-0">
                <div className="font-bold text-[#15153f]">Pix copia-e-cola</div>
                <div className="text-xs text-[#15153f]/60 break-all line-clamp-2">{res.pix.copiaCola}</div>
                <button onClick={() => copiar(res.pix!.copiaCola)} className="mt-1 text-xs font-bold text-[#333389]">copiar código</button>
              </div>
            </div>
          )}
          {res.boleto && (
            <div>
              <div className="font-bold text-[#15153f]">Boleto</div>
              {res.boleto.linhaDigitavel && <div className="text-xs text-[#15153f]/70 break-all">{res.boleto.linhaDigitavel} <button onClick={() => copiar(res.boleto!.linhaDigitavel!)} className="font-bold text-[#333389]">copiar</button></div>}
              {res.boleto.url && <a href={res.boleto.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#333389] underline">abrir PDF do boleto</a>}
            </div>
          )}
          {res.invoiceUrl && (
            <div>
              <a href={res.invoiceUrl} target="_blank" rel="noreferrer" className="inline-block rounded-full bg-[#C9A86A] text-[#15153f] font-bold px-4 py-1.5 text-xs">Página de pagamento</a>
              <button onClick={() => copiar(res.invoiceUrl!)} className="ml-2 text-xs font-bold text-[#333389]">copiar link p/ enviar ao cliente</button>
            </div>
          )}
          <p className="text-xs text-[#15153f]/45">O status vira “pago” sozinho quando o Asaas confirmar (webhook).</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- NOVO PEDIDO
type Linha = { produto_id: string | null; descricao: string; quantidade: number; preco_unitario: number; peso_g?: number; tempo_h?: number; consumo?: ConsumoLinha[] }

function NovoPedido({ produtos, impressoras, onClose, onSalvo, pedido }: { produtos: Produto[]; impressoras: Impressora[]; onClose: () => void; onSalvo: () => void; pedido?: Pedido }) {
  const ed = !!pedido
  const [linhas, setLinhas] = useState<Linha[]>(pedido ? pedido.itens_pedido.map(i => ({ produto_id: i.produto_id, descricao: i.descricao, quantidade: i.quantidade, preco_unitario: Number(i.preco_unitario), peso_g: Number(i.peso_g) || 0, tempo_h: Number(i.tempo_h) || 0, consumo: i.consumo ?? [] })) : [])
  const [cfg, setCfg] = useState<ConfigCustos | null>(null)
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [busca, setBusca] = useState('')
  const [impressora, setImpressora] = useState(pedido?.impressora ?? '')

  useEffect(() => { api('/api/admin/config-custos').then(({ ok, j }) => { if (ok) setCfg(j.config as ConfigCustos) }) }, [])
  useEffect(() => { api('/api/admin/estoque').then(({ ok, j }) => { if (ok) setInsumos((j.itens as Insumo[]).filter(i => i.ativo)) }) }, [])
  const [cliente, setCliente] = useState(pedido?.cliente_nome ?? '')
  const [telefone, setTelefone] = useState(pedido?.cliente_telefone ?? '')
  const [frete, setFrete] = useState(pedido ? Number(pedido.frete) : 0)
  const [desconto, setDesconto] = useState(pedido ? Number(pedido.desconto) : 0)
  const [pagamento, setPagamento] = useState(pedido?.forma_pagamento ?? 'dinheiro')
  const [status, setStatus] = useState(pedido?.status ?? 'pago')
  const [obs, setObs] = useState(pedido?.observacoes ?? '')
  const [imagens, setImagens] = useState<string[]>(pedido?.imagens ?? [])
  const [subindo, setSubindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviarFoto(file: File | undefined) {
    if (!file) return
    setSubindo(true); setErro('')
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const j = await r.json().catch(() => ({}))
    setSubindo(false)
    if (!r.ok) { setErro((j.error as string) || 'falha no upload'); return }
    setImagens(xs => [...xs, j.url as string])
  }

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
  function addLivre() { setLinhas(ls => [...ls, { produto_id: null, descricao: '', quantidade: 1, preco_unitario: 0, peso_g: 0, tempo_h: 0 }]) }
  function upd(i: number, patch: Partial<Linha>) { setLinhas(ls => ls.map((l, x) => x === i ? { ...l, ...patch } : l)) }
  function rm(i: number) { setLinhas(ls => ls.filter((_, x) => x !== i)) }
  function addConsumo(i: number, eid: string) {
    const ins = insumos.find(x => x.id === eid); if (!ins) return
    setLinhas(ls => ls.map((l, x) => x === i ? { ...l, consumo: [...(l.consumo ?? []), { estoque_id: ins.id, nome: ins.nome, unidade: ins.unidade, quantidade: 0, custo_unit: Number(ins.custo_unit) }] } : l))
  }
  function updConsumo(i: number, ci: number, patch: Partial<ConsumoLinha>) {
    setLinhas(ls => ls.map((l, x) => x === i ? { ...l, consumo: (l.consumo ?? []).map((c, y) => y === ci ? { ...c, ...patch } : c) } : l))
  }
  function rmConsumo(i: number, ci: number) {
    setLinhas(ls => ls.map((l, x) => x === i ? { ...l, consumo: (l.consumo ?? []).filter((_, y) => y !== ci) } : l))
  }
  const consumoCusto = (l: Linha) => (l.consumo ?? []).reduce((s, c) => s + Number(c.quantidade) * Number(c.custo_unit), 0)

  const subtotal = linhas.reduce((s, l) => s + l.preco_unitario * l.quantidade, 0)
  const total = Math.max(0, subtotal + Number(frete || 0) - Number(desconto || 0))

  async function salvar() {
    if (!linhas.length) { setErro('adicione ao menos 1 item'); return }
    setSalvando(true); setErro('')
    const corpo = { itens: linhas, cliente_nome: cliente, cliente_telefone: telefone, frete: Number(frete || 0), desconto: Number(desconto || 0), forma_pagamento: pagamento, status, observacoes: obs, impressora, imagens }
    const { ok, j } = ed
      ? await api('/api/admin/pedidos/' + pedido!.id, { method: 'PATCH', body: JSON.stringify(corpo) })
      : await api('/api/admin/pedidos', { method: 'POST', body: JSON.stringify(corpo) })
    setSalvando(false)
    if (!ok) { setErro((j.error as string) || 'erro'); return }
    onSalvo()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-[#faf9f5] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#faf9f5] px-5 pt-5 pb-3 border-b border-[#15153f]/10 flex items-center justify-between">
          <h2 className="serif text-xl font-semibold text-[#15153f]">{ed ? `Editar pedido #${pedido!.codigo}` : 'Novo pedido manual'}</h2>
          <button onClick={onClose} className="text-2xl text-[#15153f]/40 leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
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

          {/* fotos de referência (pra quem imprime/embala saber o que é) */}
          <div>
            <label className="text-xs font-semibold text-[#15153f]/60">Fotos de referência</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {imagens.map((u, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-16 w-16 object-cover rounded-lg border border-[#15153f]/10" />
                  <button onClick={() => setImagens(xs => xs.filter((_, x) => x !== i))} className="absolute -top-1.5 -right-1.5 h-5 w-5 grid place-items-center rounded-full bg-white border border-[#15153f]/15 text-[#15153f]/60 text-xs">×</button>
                </div>
              ))}
              <label className="h-16 w-16 grid place-items-center rounded-lg border-2 border-dashed border-[#15153f]/20 text-[#15153f]/40 cursor-pointer hover:border-[#C9A86A]">
                {subindo ? '…' : <span className="text-2xl leading-none">📷</span>}
                <input type="file" accept="image/*" className="hidden" onChange={e => { enviarFoto(e.target.files?.[0]); e.currentTarget.value = '' }} />
              </label>
            </div>
          </div>

          {linhas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[#15153f]/45">
                <span className="flex-1">Item</span>
                <span className="w-14 text-center">Qtd</span>
                <span className="w-20 text-center">Preço R$</span>
                <span className="w-4"></span>
              </div>
              {linhas.map((l, i) => {
                const maqH = impressoras.find(x => x.nome === impressora)?.custo_hora
                const usaC = (l.consumo ?? []).length > 0
                const custo = calcularCusto(cfg, usaC ? 0 : (l.peso_g ?? 0), l.tempo_h ?? 0, maqH) + consumoCusto(l)
                const sug = cfg ? Math.max(1, Math.round(custo * Number(cfg.markup))) : 0
                return (
                  <div key={i} className="bg-white rounded-lg border border-[#15153f]/10 p-2">
                    <div className="flex items-center gap-2">
                      <input value={l.descricao} onChange={e => upd(i, { descricao: e.target.value })} placeholder="descrição"
                        className="flex-1 min-w-0 text-sm px-2 py-1 outline-none" />
                      <input type="number" min={1} value={l.quantidade} onChange={e => upd(i, { quantidade: Math.max(1, +e.target.value) })}
                        className="w-14 text-sm px-2 py-1 border border-[#15153f]/10 rounded text-center" />
                      <input type="number" min={0} step="0.01" value={l.preco_unitario} onChange={e => upd(i, { preco_unitario: +e.target.value })} title="preço unitário (R$)"
                        className="w-20 text-sm px-2 py-1 border border-[#15153f]/10 rounded text-right" />
                      <button onClick={() => rm(i)} className="text-[#15153f]/30 hover:text-red-600 px-1">×</button>
                    </div>
                    {l.produto_id === null && (
                      <div className="mt-2 pt-2 border-t border-[#15153f]/8 text-xs text-[#15153f]/60 space-y-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-semibold">Custo:</span>
                          <label className={`flex items-center gap-1 ${usaC ? 'opacity-40 line-through' : ''}`} title={usaC ? 'ignorado — material vem do consumo abaixo' : 'peso só se NÃO usar consumo do estoque'}>peso <input type="number" min={0} value={l.peso_g ?? 0} onChange={e => upd(i, { peso_g: +e.target.value })} className="w-14 px-1.5 py-1 border border-[#15153f]/10 rounded text-right" />g</label>
                          <label className="flex items-center gap-1">tempo <input type="number" min={0} step="0.1" value={l.tempo_h ?? 0} onChange={e => upd(i, { tempo_h: +e.target.value })} className="w-14 px-1.5 py-1 border border-[#15153f]/10 rounded text-right" />h</label>
                          <span>= <b className="text-[#15153f]">{brl(custo)}</b></span>
                          {cfg && <button onClick={() => upd(i, { preco_unitario: sug })} className="font-bold text-[#333389] hover:underline">usar sugerido {brl(sug)}</button>}
                        </div>
                        {/* consumo do estoque (dá baixa depois) */}
                        <div className="space-y-1">
                          <div className="font-semibold text-[#15153f]/70">📦 Consumo do estoque <span className="font-normal text-[#15153f]/45">(por unidade · filamento, corrente, tag… — a baixa multiplica pela qtd)</span></div>
                          {insumos.length === 0 && <p className="text-[#b7791f]">Cadastre os insumos na aba <b>Estoque</b> pra escolher aqui.</p>}
                          {(l.consumo ?? []).map((c, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <span>📦</span>
                              <select value={c.estoque_id} onChange={e => { const ins = insumos.find(x => x.id === e.target.value); if (ins) updConsumo(i, ci, { estoque_id: ins.id, nome: ins.nome, unidade: ins.unidade, custo_unit: Number(ins.custo_unit) }) }}
                                className="rounded border border-[#15153f]/10 px-2 py-1 bg-white max-w-[150px]">
                                {insumos.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                              </select>
                              <input type="number" min={0} step="0.01" value={c.quantidade} onChange={e => updConsumo(i, ci, { quantidade: +e.target.value })} className="w-16 px-1.5 py-1 border border-[#15153f]/10 rounded text-right" />
                              <span className="w-5">{c.unidade}</span>
                              <span className="text-[#15153f]/70">{brl(c.quantidade * c.custo_unit)}</span>
                              <button onClick={() => rmConsumo(i, ci)} className="text-[#15153f]/30 hover:text-red-600">×</button>
                            </div>
                          ))}
                          {insumos.length > 0 && (
                            <select value="" onChange={e => { if (e.target.value) { addConsumo(i, e.target.value); e.currentTarget.value = '' } }}
                              className="rounded border border-dashed border-[#15153f]/25 px-2 py-1 bg-white text-[#333389] font-semibold">
                              <option value="">+ consumir do estoque…</option>
                              {insumos.map(x => <option key={x.id} value={x.id}>{x.nome} ({x.quantidade}{x.unidade})</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" className="rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
            <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Telefone" className="rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
            <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
              {PAG.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
              {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            {impressoras.length > 0 && (
              <select value={impressora} onChange={e => setImpressora(e.target.value)} className="col-span-2 rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
                <option value="">🖨️ Impressora (opcional)</option>
                {impressoras.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-[#15153f]/70">
              Frete R$ <input type="number" min={0} step="0.01" value={frete} onChange={e => setFrete(+e.target.value)} className="w-full rounded-lg border border-[#15153f]/15 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[#15153f]/70">
              Desconto R$ <input type="number" min={0} step="0.01" value={desconto} onChange={e => setDesconto(+e.target.value)} className="w-full rounded-lg border border-[#15153f]/15 px-3 py-2" />
            </label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações" rows={2} className="col-span-2 rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#15153f]/10 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#15153f]/45">subtotal {brl(subtotal)}{Number(frete) > 0 && ` + frete ${brl(frete)}`}{Number(desconto) > 0 && ` − desc ${brl(desconto)}`}</div>
            <span className="text-xs text-[#15153f]/50">Total</span><div className="serif text-xl font-bold text-[#15153f]">{brl(total)}</div>
          </div>
          <button onClick={salvar} disabled={salvando} className="rounded-full bg-[#15153f] text-white font-bold px-7 py-3 hover:bg-[#333389] transition disabled:opacity-50">
            {salvando ? 'salvando…' : ed ? 'Salvar alterações' : 'Salvar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- EQUIPE (só dono)
type Func = { id: string; nome: string; papel: string; ativo: boolean }

function Equipe({ onClose }: { onClose: () => void }) {
  const [lista, setLista] = useState<Func[]>([])
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [papel, setPapel] = useState('funcionario')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const { ok, j } = await api('/api/admin/funcionarios')
    if (ok) setLista(j.funcionarios as Func[])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function add() {
    setErro('')
    if (!/^\d{4,6}$/.test(pin)) { setErro('PIN de 4 a 6 dígitos'); return }
    setSalvando(true)
    const { ok, j } = await api('/api/admin/funcionarios', { method: 'POST', body: JSON.stringify({ nome, pin, papel }) })
    setSalvando(false)
    if (!ok) { setErro((j.error as string) || 'erro'); return }
    setNome(''); setPin(''); setPapel('funcionario'); carregar()
  }
  async function toggle(f: Func) { await api('/api/admin/funcionarios/' + f.id, { method: 'PATCH', body: JSON.stringify({ ativo: !f.ativo }) }); carregar() }
  async function novoPin(f: Func) {
    const p = prompt('Novo PIN (4 a 6 dígitos) para ' + f.nome)
    if (!p) return
    const { ok, j } = await api('/api/admin/funcionarios/' + f.id, { method: 'PATCH', body: JSON.stringify({ pin: p }) })
    if (!ok) alert((j.error as string) || 'erro')
  }
  async function remover(f: Func) { if (!confirm('Remover ' + f.nome + '?')) return; await api('/api/admin/funcionarios/' + f.id, { method: 'DELETE' }); carregar() }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-[#faf9f5] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#faf9f5] px-5 pt-5 pb-3 border-b border-[#15153f]/10 flex items-center justify-between">
          <h2 className="serif text-xl font-semibold text-[#15153f]">Equipe</h2>
          <button onClick={onClose} className="text-2xl text-[#15153f]/40 leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-white border border-[#15153f]/10 p-3 space-y-2">
            <div className="text-xs font-semibold text-[#15153f]/60">Adicionar pessoa</div>
            <div className="flex flex-wrap gap-2">
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="flex-1 min-w-[120px] rounded-lg border border-[#15153f]/15 px-3 py-2 outline-none focus:border-[#C9A86A]" />
              <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" placeholder="PIN" className="w-24 rounded-lg border border-[#15153f]/15 px-3 py-2 text-center tracking-widest outline-none focus:border-[#C9A86A]" />
              <select value={papel} onChange={e => setPapel(e.target.value)} className="rounded-lg border border-[#15153f]/15 px-3 py-2 bg-white">
                <option value="funcionario">Funcionário</option><option value="dono">Dono</option>
              </select>
              <button onClick={add} disabled={salvando} className="rounded-full bg-[#15153f] text-white font-bold px-5 py-2 text-sm hover:bg-[#333389] disabled:opacity-50">Adicionar</button>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
          </div>

          <div className="space-y-2">
            {lista.map(f => (
              <div key={f.id} className={`flex items-center justify-between rounded-xl bg-white border border-[#15153f]/10 p-3 ${f.ativo ? '' : 'opacity-50'}`}>
                <div>
                  <div className="font-semibold text-[#15153f]">{f.nome} {f.papel === 'dono' && <span className="text-[10px] font-bold text-[#C9A86A]">DONO</span>}</div>
                  <div className="text-xs text-[#15153f]/45">{f.ativo ? 'ativo' : 'inativo'}</div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button onClick={() => novoPin(f)} className="text-[#333389]">trocar PIN</button>
                  <button onClick={() => toggle(f)} className="text-[#15153f]/60">{f.ativo ? 'desativar' : 'ativar'}</button>
                  <button onClick={() => remover(f)} className="text-[#15153f]/40 hover:text-red-600">remover</button>
                </div>
              </div>
            ))}
            {!lista.length && <p className="text-center text-sm text-[#15153f]/40 py-6">Nenhum funcionário ainda. O dono entra pela senha mestra.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
