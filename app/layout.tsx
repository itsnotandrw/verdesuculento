import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Nav from '@/components/Nav';
import MobileNav from '@/components/MobileNav';
import FloatingActions from '@/components/FloatingActions';
import ChromeGate from '@/components/ChromeGate';
import { CategoryCountsProvider } from '@/context/CategoryCountsContext';
import { getAllProducts } from '@/lib/catalog/store';
import { getOfertas } from '@/lib/promotions-store';
import { OffersProvider } from '@/context/OffersContext';
import Footer from '@/components/Footer';
import MiniCart from '@/components/MiniCart';
import CustomCursor from '@/components/CustomCursor';
import QuickView from '@/components/QuickView';
import ScrollToTop from '@/components/ScrollToTop';

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

// Las páginas estáticas se regeneran cada 60 s con los datos de Redis (promociones, ofertas del menú, catálogo).
// Necesario porque en el build no hay Redis disponible y se hornea el respaldo estático.
export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    default: 'Vivero Verde Suculento — Suculentas, Frutales & Agricultura Moderna',
    template: '%s | Vivero Verde Suculento',
  },
  description: 'Vivero especializado en frutales, ornamentales y agricultura moderna. Envíos a toda Colombia con garantía de plantas vivas.',
  keywords: ['vivero', 'plantas', 'frutales', 'Colombia', 'agricultura', 'suculentas', 'ornamentales'],
  openGraph: {
    title: 'Vivero Verde Suculento — Suculentas, Frutales & Agricultura Moderna',
    description: 'Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos.',
    siteName: 'Vivero Verde Suculento',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vivero Verde Suculento — Suculentas, Frutales & Agricultura Moderna',
    description: 'Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const visibles = await getAllProducts();
  const counts: Record<string, number> = {};
  for (const p of visibles) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const ofertas = (await getOfertas().catch(() => [])).map((o) => ({ slug: o.slug, label: o.title, pct: o.pct, kind: o.kind }));

  return (
    <html lang="es" data-theme="dark" className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try{
            var t=localStorage.getItem('verde-theme');
            if(t)document.documentElement.setAttribute('data-theme',t);
            else if(window.matchMedia('(prefers-color-scheme: light)').matches)document.documentElement.setAttribute('data-theme','light');
          }catch(e){}
        ` }} />
      </head>
      <body>
        <Providers>
          <CategoryCountsProvider counts={counts}>
          <OffersProvider offers={ofertas}>
          <a href="#main-content" className="skip-to-content">Saltar al contenido principal</a>
          <CustomCursor />
          <ChromeGate><Nav /></ChromeGate>
          <main id="main-content">
            {children}
          </main>
          <ChromeGate>
            <Footer />
            <MobileNav />
            <FloatingActions />
          </ChromeGate>
          </OffersProvider>
          </CategoryCountsProvider>
          <MiniCart />
          <QuickView />
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
