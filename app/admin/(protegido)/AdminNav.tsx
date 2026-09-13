'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/catalogo', label: 'Catálogo' },
  { href: '/admin/cuenta', label: 'Cuenta' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const salir = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 16, flexWrap: 'wrap', padding: '16px 0', marginBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="chip"
            style={pathname?.startsWith(l.href) ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' } : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={salir}>Cerrar sesión</button>
    </div>
  );
}
