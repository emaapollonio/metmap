import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MetMap',
    short_name: 'MetMap',
    start_url: '/',
    display: 'standalone',
    background_color: '#f1e6d2',
    theme_color: '#f1e6d2',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
