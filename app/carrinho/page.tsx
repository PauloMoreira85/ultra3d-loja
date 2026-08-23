'use client'
import Link from 'next/link'
import Header from '@/components/Header'
import { brl } from '@/lib/supabase'
import { useCart } from '@/lib/cart'

const WHATSAPP = '5500000000000' // TODO: trocar pelo número real da Ultra 3D

export default function Carrinho() {
  const { items, setQtd, remove } = useCart()
  const subtotal = items.reduce((s, x) => s + x.produto.preco * x.qtd, 0)

  const pedirWhats = () => {
    const linhas = items.map(x => `- ${x.qtd}x ${x.produto.nome} (${brl(x.produto.preco * x.qtd)})`).join('\n')
    const msg = `Olá! Quero fazer um pedido na Ultra 3D Brasil:\n\n${linhas}\n\nSubtotal: ${brl(subtotal)}`
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 pb-44 pt-4">
        <h1 className="text-3xl font-extrabold mb-4 text-[#333389]">Seu carrinho</h1>

        {items.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E7DFCF] p-8 text-center">
            <p className="text-[#6f6d86]">Seu carrinho está vazio.</p>
            <Link href="/" className="inline-block mt-4 rounded-lg bg-[#C9A86A] text-[#333389] font-bold px-5 py-2.5">Ver catálogo</Link>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {items.map(({ produto: p, qtd, opcoes }) => {
              const linha = `${p.id}|${opcoes ?? ''}`
              return (
                <div key={linha} className="flex items-center gap-3 rounded-xl bg-white border border-[#E7DFCF] p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold leading-tight text-[#333389]">{p.nome}</div>
                    <div className="text-sm text-[#C9A86A] font-bold mt-0.5">{brl(p.preco)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQtd(linha, qtd - 1)} className="h-8 w-8 rounded-lg bg-[#faf9f5] border border-[#E7DFCF] font-bold text-lg leading-none">−</button>
                    <span className="w-6 text-center font-bold">{qtd}</span>
                    <button onClick={() => setQtd(linha, qtd + 1)} className="h-8 w-8 rounded-lg bg-[#faf9f5] border border-[#E7DFCF] font-bold text-lg leading-none">+</button>
                  </div>
                  <div className="w-20 text-right font-extrabold text-[#333389]">{brl(p.preco * qtd)}</div>
                  <button onClick={() => remove(linha)} className="text-[#b3462b] text-lg" aria-label="Remover">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[#333389] bg-[#faf9f5] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between text-lg font-extrabold text-[#333389]"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <button onClick={pedirWhats} className="mt-3 w-full rounded-xl bg-[#25d366] text-white font-bold px-4 py-3 active:scale-95 transition">Finalizar pelo WhatsApp</button>
            <p className="text-center text-[11px] text-[#6f6d86] mt-2">Pagamento e frete combinados no WhatsApp — checkout automático (Pix/cartão + Melhor Envio) em breve.</p>
          </div>
        </div>
      )}
    </>
  )
}
