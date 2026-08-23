'use client'
import Link from 'next/link'
import { useCart } from '@/lib/cart'

export default function Header() {
  const { count } = useCart()
  return (
    <header className="sticky top-0 z-40 bg-[#faf9f5]/90 backdrop-blur border-b-2 border-[#333389]">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#333389] text-[#C9A86A] text-sm leading-none font-extrabold">3D</span>
          <span className="text-lg font-extrabold text-[#333389]">Ultra <span className="text-[#C9A86A]">3D</span> Brasil</span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="https://instagram.com/ultra3d.brasil" target="_blank" rel="noopener noreferrer" aria-label="Siga no Instagram"
            className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-white font-extrabold text-[13px] active:scale-95 transition shadow-sm"
            style={{ background: 'linear-gradient(45deg,#F58529 0%,#DD2A7B 45%,#8134AF 75%,#515BD4 100%)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5.5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.4" cy="6.6" r="1.2" fill="white" stroke="none" />
            </svg>
            <span className="hidden sm:inline">Siga a gente</span>
            <span className="sm:hidden">Siga</span>
          </a>
          <Link href="/carrinho" className="relative flex items-center gap-2 rounded-lg bg-[#333389] text-[#faf9f5] px-3 py-2 text-sm font-bold">
            🛒 Carrinho
            {count > 0 && <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#C9A86A] text-white text-xs font-bold px-1">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
