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
        const pc = (c.data ?? []) as Categoria[]
        const pp = (p.data ?? []) as Produto[]
        if (pp.length === 0) { setCats(demoCategorias); setProds(demoProdutos); setDemo(true) }
        else { setCats(pc); setProds(pp) }
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
      <Header />
      <main className="max-w-3xl mx-auto px-4 pb-28">
        <section className="pt-7 pb-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#333389] text-[#C9A86A] text-3xl leading-none shadow-md font-extrabold">3D</span>
            <span className="text-3xl font-extrabold tracking-tight text-[#333389]">Ultra <span className="text-[#C9A86A]">3D</span> Brasil</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight mt-4 text-[#333389]">Peças 3D <span className="text-[#C9A86A]">feitas pra você</span></h1>
          <p className="mt-2 text-sm text-[#6f6d86]">Decoração, colecionáveis e brindes personalizados · Maringá/PR · enviamos pra todo o Brasil</p>
        </section>

        {comProdutos.length > 0 && (
          <nav className="sticky top-16 z-30 -mx-4 px-4 py-2.5 bg-[#faf9f5]/95 backdrop-blur border-y border-[#E7DFCF] mb-6">
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {comProdutos.map(c => (
                <a key={c.id} href={`#sec-${c.id}`} className="shrink-0 rounded-full bg-white border border-[#E7DFCF] px-4 py-1.5 text-sm font-bold text-[#43425c] whitespace-nowrap active:bg-[#C9A86A] active:text-[#333389]">{c.nome}</a>
              ))}
            </div>
          </nav>
        )}

        {demo && !loading && (
          <div className="mb-5 rounded-lg bg-[#C9A86A]/20 border border-[#C9A86A] text-[#5a4a00] text-xs font-semibold px-3 py-2 text-center">
            Vitrine em modo demonstração — produtos de exemplo. Ao conectar o banco, entram os produtos reais.
          </div>
        )}

        {loading && <p className="text-[#6f6d86]">Carregando o catálogo…</p>}

        {cats.map(cat => {
          const list = prods.filter(p => p.categoria_id === cat.id)
          if (!list.length) return null
          return (
            <section key={cat.id} id={`sec-${cat.id}`} className="mb-8 scroll-mt-32">
              <h2 className="text-2xl font-extrabold mb-3 text-[#333389]">{cat.nome}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {list.map((p) => {
                  const out = esgotado(p)
                  return (
                    <div key={p.id} className={`rounded-2xl bg-white border border-[#E7DFCF] overflow-hidden flex flex-col ${out ? 'opacity-60' : ''}`}>
                      <div className="aspect-square bg-[#F0ECE2] grid place-items-center overflow-hidden">
                        {p.foto_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.foto_url} alt={p.nome} onClick={() => p.foto_url && setZoom(p.foto_url)} className={`h-full w-full object-cover cursor-zoom-in ${out ? 'grayscale' : ''}`} />
                          : <span className="text-4xl text-[#C9A86A]/60 font-extrabold">3D</span>}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="font-bold leading-tight text-[#333389] text-sm">{p.nome}</div>
                        {p.descricao && <div className="text-[11px] text-[#6f6d86] mt-0.5 line-clamp-2">{p.descricao}</div>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[#C9A86A] font-extrabold">{brl(p.preco)}</span>
                          {out
                            ? <span className="text-[11px] font-bold text-[#6f6d86]">Esgotado</span>
                            : <button onClick={() => add(p)} className="rounded-lg bg-[#C9A86A] text-[#333389] font-bold px-3 py-1.5 text-sm active:scale-95 transition">+ Add</button>}
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[#333389] bg-[#faf9f5] p-3">
          <Link href="/carrinho" className="max-w-3xl mx-auto flex items-center justify-between rounded-xl bg-[#333389] text-[#faf9f5] font-bold px-4 py-3">
            <span>{count} {count === 1 ? 'item' : 'itens'}</span>
            <span>Ver carrinho · {brl(total)} →</span>
          </Link>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center p-3" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-w-full max-h-full rounded-xl" />
          <button aria-label="Fechar" className="absolute top-4 right-5 text-white text-4xl leading-none">×</button>
        </div>
      )}
    </>
  )
}
