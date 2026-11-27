import Link from 'next/link';
import Image from 'next/image';
import { CONTACTO } from '@/data/contacto';
import ContactCard, { IconoWhatsApp } from '@/components/ContactCard';
import { ShoppingBag } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Image src="/logo-icon.png" alt="" width={48} height={48} style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <div className="display" style={{ fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                Vivero Verde<br />Suculento<em style={{ color: 'var(--accent)' }}>.</em>
              </div>
            </div>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 360, marginBottom: 24, lineHeight: 1.55 }}>
              Vivero especializado en frutales, ornamentales y agricultura moderna. Envíos a toda Colombia.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="chip"><IconoWhatsApp size={15} /> WhatsApp</a>
              <a href="https://www.facebook.com/p/Verde-Suculento-100091965755148/" target="_blank" rel="noopener noreferrer" className="chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.9.3-1.5 1.6-1.5H16.7V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.3v3h2.5V21h2.7Z" /></svg> Facebook
              </a>
              <a href="https://www.mercadolibre.com.co/pagina/viveroverde_suculento" target="_blank" rel="noopener noreferrer" className="chip"><ShoppingBag size={15} aria-hidden="true" /> Mercado Libre</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Servicio</h4>
            <ul className="footer-links-2">
              <li><Link href="/mis-pedidos">Mis pedidos</Link></li>
              <li><Link href="/asesoria">Asesoría agronómica</Link></li>
              <li><a href={`${CONTACTO.whatsappUrl}?text=${encodeURIComponent('Hola, quisiera información para compras al por mayor.')}`} target="_blank" rel="noopener noreferrer">Mayoristas</a></li>
              <li><Link href="/nosotros">Nosotros</Link></li>
              <li><Link href="/diario">Diario</Link></li>
              <li><Link href="/privacidad">Política de datos y cookies</Link></li>
            </ul>
          </div>

          <div className="footer-col footer-contact">
            <ContactCard />
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Vivero Verde Suculento. Envíos a toda Colombia.</span>
          <span>SOACHA · CUNDINAMARCA</span>
        </div>
      </div>
    </footer>
  );
}
