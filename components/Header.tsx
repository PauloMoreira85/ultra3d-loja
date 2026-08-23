'use client'
import Link from 'next/link'
import { useCart } from '@/lib/cart'

export default function Header() {
  const { count } = useCart()
  return (
    <header className="sticky top-0 z-40 bg-[#faf9f5]/85 backdrop-blur border-b border-[#15153f]/10">
      <div className="max-w-5xl mx-auto px-5 h-[70px] flex items-center justify-between">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ultra.png" alt="Ultra 3D Brasil" className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <a href="https://instagram.com/ultra3d.brasil" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-white font-bold text-[13px] active:scale-95 transition shadow-sm"
            style={{ background: 'linear-gradient(45deg,#F58529 0%,#DD2A7B 45%,#8134AF 75%,#515BD4 100%)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.2" fill="white" stroke="none" />
            </svg>
            <span className="hidden sm:inline">Seguir</span>
          </a>
          <Link href="/carrinho" className="relative flex items-center gap-2 rounded-full bg-[#15153f] text-[#faf9f5] px-4 py-2 text-sm font-bold hover:bg-[#333389] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="hidden sm:inline">Carrinho</span>
            {count > 0 && <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#C9A86A] text-[#15153f] text-xs font-extrabold px-1">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
