'use client';

import { usePathname } from 'next/navigation';

/** Oculta el "cromo" de la tienda (menú, pie, botones flotantes…) dentro del panel /admin, que trae el suyo. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <>{children}</>;
}
