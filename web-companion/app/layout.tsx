import type { Metadata, Viewport } from 'next';
import { Playfair_Display } from 'next/font/google';
import './globals.css';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';

const playfair = Playfair_Display({ subsets: ['latin'], weight: '700', variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'MetMap – Quick Add',
  description: 'Quickly add the people you meet on the road.',
  applicationName: 'MetMap',
  appleWebApp: { capable: true, title: 'MetMap', statusBarStyle: 'default' },
  icons: { icon: '/favicon.png', apple: '/icon-180.png' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f1e6d2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
