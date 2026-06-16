import Link from 'next/link';
import { CATEGORIES } from '@/data/catalog';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="display" style={{ fontSize: 72, marginBottom: 16, letterSpacing: '-0.025em' }}>
              verde<em style={{ color: 'var(--accent)' }}>.</em>
            </div>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 360, marginBottom: 24, lineHeight: 1.55 }}>
              Vivero especializado en frutales, ornamentales y agricultura moderna. Envíos a toda Colombia.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#" className="chip">Instagram</a>
              <a href="#" className="chip">WhatsApp</a>
              <a href="#" className="chip">YouTube</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Catálogo</h4>
            <ul>
              {CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/catalogo/${cat.id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Servicio</h4>
            <ul>
              <li><a href="#">Envíos a Colombia</a></li>
              <li><a href="#">Garantía de plantas</a></li>
              <li><a href="#">Política de cambios</a></li>
              <li><a href="#">Asesoría agronómica</a></li>
              <li><a href="#">Mayoristas</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contacto</h4>
            <ul>
              <li><a href="tel:+573205550102">+57 320 555 0102</a></li>
              <li><a href="mailto:hola@verde.co">hola@verde.co</a></li>
              <li><a href="#">Lun—Sáb · 8 — 6 pm</a></li>
              <li><a href="#">Km 3 vía La Ceja, Antioquia</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 VERDE. Vivero &amp; agricultura moderna.</span>
          <span>BOGOTÁ · MEDELLÍN · CALI</span>
        </div>
      </div>
    </footer>
  );
}
