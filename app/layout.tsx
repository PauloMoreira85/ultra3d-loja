import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CartProvider } from '@/lib/cart'

export const metadata: Metadata = {
  title: 'Ultra 3D Brasil — Loja de impressão 3D',
  description: 'Peças de decoração, colecionáveis e brindes personalizados em impressão 3D. Maringá/PR.',
}
export const viewport: Viewport = { themeColor: '#333389', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-[#faf9f5] text-[#333389]">
        <CartProvider>{children}</CartProvider>
        <footer className="border-t border-[#E7DFCF] mt-8 py-5 px-4 text-center">
          <p className="max-w-3xl mx-auto text-xs text-[#8a8598]">Ultra 3D Brasil · Impressão 3D autoral · Maringá/PR · <a href="https://instagram.com/ultra3d.brasil" className="underline">@ultra3d.brasil</a></p>
        </footer>
      </body>
    </html>
  )
}
