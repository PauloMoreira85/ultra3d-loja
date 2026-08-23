'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Produto } from './supabase'

export type CartItem = { produto: Produto; qtd: number; opcoes?: string }
// cada linha é única por produto + opções escolhidas (combos)
export const linhaId = (produtoId: string, opcoes?: string) => `${produtoId}|${opcoes ?? ''}`

type Ctx = {
  items: CartItem[]
  add: (p: Produto, opcoes?: string) => void
  setQtd: (linha: string, q: number) => void
  remove: (linha: string) => void
  clear: () => void
  count: number
}
const CartCtx = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { try { const s = localStorage.getItem('ultra3d_cart'); if (s) setItems(JSON.parse(s)) } catch {} setLoaded(true) }, [])
  useEffect(() => { if (loaded) localStorage.setItem('ultra3d_cart', JSON.stringify(items)) }, [items, loaded])

  const add = (p: Produto, opcoes?: string) => setItems(it => {
    const id = linhaId(p.id, opcoes)
    const e = it.find(x => linhaId(x.produto.id, x.opcoes) === id)
    return e ? it.map(x => linhaId(x.produto.id, x.opcoes) === id ? { ...x, qtd: x.qtd + 1 } : x) : [...it, { produto: p, qtd: 1, opcoes }]
  })
  const setQtd = (linha: string, q: number) => setItems(it => q <= 0 ? it.filter(x => linhaId(x.produto.id, x.opcoes) !== linha) : it.map(x => linhaId(x.produto.id, x.opcoes) === linha ? { ...x, qtd: q } : x))
  const remove = (linha: string) => setItems(it => it.filter(x => linhaId(x.produto.id, x.opcoes) !== linha))
  const clear = () => setItems([])
  const count = items.reduce((s, x) => s + x.qtd, 0)

  return <CartCtx.Provider value={{ items, add, setQtd, remove, clear, count }}>{children}</CartCtx.Provider>
}
export const useCart = () => { const c = useContext(CartCtx); if (!c) throw new Error('useCart fora do CartProvider'); return c }
