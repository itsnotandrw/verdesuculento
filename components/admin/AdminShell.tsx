'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Bell, ExternalLink, Home, LayoutTemplate, LogOut, Menu, Moon, MousePointerClick, Percent, Search,
  Settings, ShoppingBag, Sun, Tags, X,
} from 'lucide-react';
import type { ToastKind } from './toast';

export interface Aviso { label: string; href: string }
interface Props { children: React.ReactNode; avisos: Aviso[]; pendientesVentas: number }

const NAV = [
  { href: '/admin', label: 'Resumen', icon: Home, exact: true },
  { href: '/admin/catalogo', label: 'Publicaciones', icon: Tags },
  { href: '/admin/promociones', label: 'Promociones', icon: Percent },
  { href: '/admin/pagina', label: 'Mi página', icon: LayoutTemplate },
  { href: '/admin/imagenes', label: 'Imágenes interactivas', icon: MousePointerClick },
  { href: '/admin/pedidos', label: 'Ventas', icon: ShoppingBag, badge: true },
  { href: '/admin/metricas', label: 'Métricas', icon: BarChart3 },
  { href: '/admin/cuenta', label: 'Preferencias', icon: Settings },
] as const;

const THEME_KEY = 'adm-theme';

export default function AdminShell({ children, avisos, pendientesVentas }: Props) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [drawer, setDrawer] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const userRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { if (localStorage.getItem(THEME_KEY) === 'light') setTheme('light'); } catch { /* sin storage */ }
  }, []);
  const toggleTheme = () => setTheme((t) => {
    const n = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, n); } catch { /* sin storage */ }
    return n;
  });

  // Toasts
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      const id = ++n;
      setToasts((t) => [...t, { id, ...d }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
    };
    window.addEventListener('adm-toast', on);
    return () => window.removeEventListener('adm-toast', on);
  }, []);

  // Ctrl/⌘ + K, cerrar menús al hacer clic fuera
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === 'Escape') { setPalette(false); setUserMenu(false); setBell(false); setDrawer(false); }
    };
    const down = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBell(false);
    };
    window.addEventListener('keydown', key);
    document.addEventListener('mousedown', down);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('mousedown', down); };
  }, []);

  useEffect(() => { setDrawer(false); setPalette(false); }, [pathname]);

  const isOn = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const comandos = [
    ...NAV.map((n) => ({ label: n.label, href: n.href, hint: 'Ir a' })),
    { label: 'Crear promoción', href: '/admin/promociones?crear=1', hint: 'Acción' },
    { label: 'Crear cupón', href: '/admin/promociones?tab=cupones&crear=cupon', hint: 'Acción' },
    { label: 'Nuevo producto', href: '/admin/catalogo/nuevo', hint: 'Acción' },
    { label: 'Ver la tienda', href: '/', hint: 'Sitio' },
  ];
  const lista = comandos.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  const abrir = useCallback((href: string) => { setPalette(false); setQ(''); router.push(href); }, [router]);

  const salir = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/login');
  };

  const tabsRapidas = NAV.filter((n) => ['/admin', '/admin/pedidos', '/admin/catalogo', '/admin/promociones'].includes(n.href));

  return (
    <div className="adm" data-adm-theme={theme}>
      <header className="adm-header">
        <button className="adm-hbtn adm-burger" aria-label="Abrir menú" onClick={() => setDrawer(true)} style={{ display: 'none', padding: 0, width: 36, justifyContent: 'center' }}>
          <Menu size={20} />
        </button>
        <Link href="/admin" className="adm-brand">
          <Image src="/logo-icon.png" alt="" width={30} height={30} />
          <span>Dashboard<small>Vivero Verde Suculento</small></span>
        </Link>

        <button className="adm-search" onClick={() => setPalette(true)} aria-label="Buscar en el panel">
          <Search size={16} />
          <span>Buscar secciones y acciones…</span>
          <span className="adm-kbd">Ctrl K</span>
        </button>

        <div className="adm-hactions">
          <Link href="/" target="_blank" className="adm-hbtn"><ExternalLink size={16} /><span className="adm-hlabel">Ver tienda</span></Link>
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button className="adm-hbtn" aria-label="Notificaciones" onClick={() => setBell((b) => !b)} style={{ padding: '0 10px' }}>
              <Bell size={18} />
              {avisos.length > 0 && <span className="adm-dot">{avisos.length}</span>}
            </button>
            {bell && (
              <div className="adm-menu" style={{ minWidth: 280 }}>
                <div className="adm-menu-id"><b>Pendientes</b><span>{avisos.length ? 'Cosas que piden tu atención' : 'Todo al día'}</span></div>
                <hr />
                {avisos.map((a) => (
                  <Link key={a.label} href={a.href} onClick={() => setBell(false)}>{a.label}</Link>
                ))}
                {avisos.length === 0 && <p style={{ padding: '6px 10px 10px', color: 'var(--a-mute)', fontSize: 13 }}>No hay tareas pendientes.</p>}
              </div>
            )}
          </div>
          <button className="adm-hbtn" aria-label="Cambiar tema" onClick={toggleTheme} style={{ padding: '0 10px' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div ref={userRef} style={{ position: 'relative' }}>
            <button className="adm-hbtn" onClick={() => setUserMenu((o) => !o)} aria-haspopup="menu" aria-expanded={userMenu}>
              <span className="adm-avatar">VS</span>
              <span className="adm-hlabel">Vivero Verde</span>
            </button>
            {userMenu && (
              <div className="adm-menu" role="menu">
                <div className="adm-menu-id"><b>Vivero Verde Suculento</b><span>Administrador</span></div>
                <hr />
                <Link href="/admin/cuenta" role="menuitem"><Settings size={16} />Preferencias</Link>
                <button type="button" onClick={toggleTheme} role="menuitem">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button>
                <hr />
                <button type="button" onClick={salir} role="menuitem"><LogOut size={16} />Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="adm-tabs" aria-label="Accesos rápidos">
        {tabsRapidas.map((t) => (
          <Link key={t.href} href={t.href} className={isOn(t.href, 'exact' in t ? t.exact : false) ? 'on' : ''}>{t.label}</Link>
        ))}
        <Link href="/" target="_blank" className="adm-tabs-end">Ir a la tienda →</Link>
      </nav>

      <div className="adm-body">
        {drawer && <div className="adm-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
        <aside className={`adm-side${drawer ? ' open' : ''}`}>
          <p className="adm-side-title">Menú</p>
          <nav className="adm-nav" aria-label="Secciones del panel">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} className={isOn(n.href, 'exact' in n ? n.exact : false) ? 'on' : ''} aria-current={isOn(n.href, 'exact' in n ? n.exact : false) ? 'page' : undefined}>
                  <Icon size={19} />
                  <span>{n.label}</span>
                  {'badge' in n && pendientesVentas > 0 && <span className="adm-count">{pendientesVentas}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="adm-side-foot">
            <b>¿Necesitas ayuda?</b>
            Escríbenos por WhatsApp y te acompañamos con el panel.
            <div style={{ marginTop: 8 }}><a className="adm-link" href="https://wa.me/573205550102" target="_blank" rel="noopener noreferrer">Abrir WhatsApp →</a></div>
          </div>
        </aside>
        <main className="adm-main"><div className="adm-wrap">{children}</div></main>
      </div>

      {palette && (
        <div className="adm-modalbg" onMouseDown={(e) => e.target === e.currentTarget && setPalette(false)}>
          <div className="adm-modal" role="dialog" aria-label="Buscar en el panel">
            <div className="adm-modal-h" style={{ gap: 10 }}>
              <Search size={18} />
              <input
                autoFocus
                className="adm-input"
                style={{ border: 0, boxShadow: 'none', height: 36, padding: 0, background: 'transparent' }}
                placeholder="Escribe una sección o acción…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setHi(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, lista.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                  else if (e.key === 'Enter' && lista[hi]) abrir(lista[hi].href);
                }}
              />
              <button className="adm-x" onClick={() => setPalette(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="adm-pal-list">
              {lista.map((c, i) => (
                <button key={c.label} className={`adm-pal-item${i === hi ? ' hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => abrir(c.href)}>
                  {c.label}<small>{c.hint}</small>
                </button>
              ))}
              {lista.length === 0 && <p style={{ padding: 16, color: 'var(--a-mute)' }}>Sin resultados.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="adm-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`adm-toast${t.kind === 'bad' ? ' bad' : ''}`}>{t.message}</div>)}
      </div>
    </div>
  );
}
