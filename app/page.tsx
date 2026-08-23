'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { supabase, brl, esgotado, type Produto, type Categoria } from '@/lib/supabase'
import { demoCategorias, demoProdutos } from '@/lib/demo'
import { useCart } from '@/lib/cart'

export default function Catalogo() {
  const { add, count, items } = useCart()
  const [cats, setCats] = useState<Categoria[]>([])
  const [prods, setProds] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
          supabase.from('produtos').select('*').eq('ativo', true).order('ordem'),
        ])
        const pp = (p.data ?? []) as Produto[]
        if (pp.length === 0) { setCats(demoCategorias); setProds(demoProdutos); setDemo(true) }
        else { setCats((c.data ?? []) as Categoria[]); setProds(pp) }
      } catch {
        setCats(demoCategorias); setProds(demoProdutos); setDemo(true)
      }
      setLoading(false)
    })()
  }, [])

  const total = items.reduce((s, x) => s + x.produto.preco * x.qtd, 0)
  const comProdutos = cats.filter(c => prods.some(p => p.categoria_id === c.id))

  return (
    <>
      {demo && (
        <div className="bg-[#15153f] text-[#faf9f5]/80 text-[11px] tracking-wide text-center py-1.5 px-4">
          Vitrine de demonstração · produtos de exemplo
        </div>
      )}
      <Header />

      <main className="max-w-5xl mx-auto px-5 pb-28">
        {/* HERO */}
        <section className="pt-14 pb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ultra.png" alt="Ultra 3D Brasil" className="h-14 sm:h-16 w-auto mx-auto mb-7" />
          <span className="inline-block text-[11px] tracking-[0.28em] uppercase font-semibold text-[#C9A86A]">Impressão 3D autoral</span>
          <h1 className="serif text-4xl sm:text-6xl font-semibold leading-[1.02] mt-3 text-[#15153f]">
            Peças que viram <span className="italic text-[#333389]">objeto de desejo</span>
          </h1>
          <p className="mt-5 text-[15px] sm:text-base text-[#15153f]/60 max-w-xl mx-auto leading-relaxed">
            Decoração, colecionáveis e brindes personalizados — impressos com acabamento de gente grande.
            Maringá/PR · enviamos para todo o Brasil.
          </p>
        </section>

        {/* NAV categorias */}
        {comProdutos.length > 0 && (
          <nav className="sticky top-[70px] z-30 -mx-5 px-5 py-3 bg-[#faf9f5]/92 backdrop-blur border-y border-[#15153f]/8 mb-9">
            <div className="flex gap-2 overflow-x-auto max-w-5xl mx-auto">
              {comProdutos.map(c => (
                <a key={c.id} href={`#sec-${c.id}`} className="shrink-0 rounded-full bg-white border border-[#15153f]/10 px-4 py-1.5 text-sm font-semibold text-[#15153f]/75 whitespace-nowrap hover:border-[#C9A86A] hover:text-[#333389] transition">{c.nome}</a>
              ))}
            </div>
          </nav>
        )}

        {loading && <p className="text-center text-[#15153f]/50 py-10">Carregando o catálogo…</p>}

        {cats.map(cat => {
          const list = prods.filter(p => p.categoria_id === cat.id)
          if (!list.length) return null
          return (
            <section key={cat.id} id={`sec-${cat.id}`} className="mb-14 scroll-mt-36">
              <div className="flex items-end justify-between mb-5">
                <h2 className="serif text-3xl font-semibold text-[#15153f]">{cat.nome}</h2>
                <span className="text-xs text-[#15153f]/40 font-medium">{list.length} {list.length === 1 ? 'peça' : 'peças'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {list.map((p) => {
                  const out = esgotado(p)
                  return (
                    <div key={p.id} className={`group rounded-2xl bg-white border border-[#15153f]/8 overflow-hidden flex flex-col transition hover:shadow-[0_18px_40px_-20px_rgba(21,21,63,0.35)] hover:-translate-y-1 ${out ? 'opacity-60' : ''}`}>
                      <div className="aspect-square bg-gradient-to-br from-[#f0eee6] to-[#e6e3d8] grid place-items-center overflow-hidden">
                        {p.foto_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.foto_url} alt={p.nome} onClick={() => p.foto_url && setZoom(p.foto_url)} className={`h-full w-full object-cover cursor-zoom-in transition duration-500 group-hover:scale-105 ${out ? 'grayscale' : ''}`} />
                          : <span className="serif text-4xl text-[#C9A86A]/50">3D</span>}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="font-bold leading-snug text-[#15153f] text-[15px]">{p.nome}</div>
                        {p.descricao && <div className="text-xs text-[#15153f]/55 mt-1 line-clamp-2 leading-relaxed">{p.descricao}</div>}
                        <div className="mt-3 pt-3 border-t border-[#15153f]/8 flex items-center justify-between gap-2">
                          <span className="serif text-lg font-bold text-[#333389]">{brl(p.preco)}</span>
                          {out
                            ? <span className="text-[11px] font-bold text-[#15153f]/40">Esgotado</span>
                            : <button onClick={() => add(p)} className="rounded-full bg-[#C9A86A] text-[#15153f] font-bold px-3.5 py-1.5 text-sm hover:bg-[#b8955a] active:scale-95 transition">Adicionar</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>

      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#15153f]/10 bg-[#faf9f5]/95 backdrop-blur p-3">
          <Link href="/carrinho" className="max-w-5xl mx-auto flex items-center justify-between rounded-full bg-[#15153f] text-[#faf9f5] font-bold px-6 py-3.5 hover:bg-[#333389] transition">
            <span>{count} {count === 1 ? 'item' : 'itens'} no carrinho</span>
            <span className="flex items-center gap-2">{brl(total)} <span className="text-[#C9A86A]">→</span></span>
          </Link>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-w-full max-h-full rounded-2xl" />
          <button aria-label="Fechar" className="absolute top-4 right-6 text-white text-4xl leading-none">×</button>
        </div>
      )}
    </>
  )
}
