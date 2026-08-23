import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ultra 3D Brasil — Loja',
    short_name: 'Ultra 3D Brasil',
    description: 'Decoração, colecionáveis e brindes personalizados em 3D.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f5',
    theme_color: '#333389',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
