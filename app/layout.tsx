import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Nav from '@/components/Nav';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import MiniCart from '@/components/MiniCart';
import CustomCursor from '@/components/CustomCursor';
import QuickView from '@/components/QuickView';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-display-next',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui-next',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-next',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VERDE. — Vivero & Agricultura Moderna',
    template: '%s | VERDE.',
  },
  description: 'Vivero especializado en frutales, ornamentales y agricultura moderna. Envíos a toda Colombia con garantía de plantas vivas.',
  keywords: ['vivero', 'plantas', 'frutales', 'Colombia', 'agricultura', 'suculentas', 'ornamentales'],
  openGraph: {
    title: 'VERDE. — Vivero & Agricultura Moderna',
    description: 'Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos.',
    siteName: 'VERDE.',
    locale: 'es_CO',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-flash: aplica el tema guardado antes de que React hidrate */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('verde-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
      </head>
      <body>
        <Providers>
          <CustomCursor />
          <Nav />
          {children}
          <Footer />
          <MobileNav />
          <MiniCart />
          <QuickView />
        </Providers>
      </body>
    </html>
  );
}
