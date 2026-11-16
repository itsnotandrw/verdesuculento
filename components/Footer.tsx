import Link from 'next/link';
import Image from 'next/image';
import { CATEGORIES } from '@/data/catalog';
import { CONTACTO } from '@/data/contacto';

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
              <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="chip">WhatsApp</a>
              <a href="https://www.facebook.com/p/Verde-Suculento-100091965755148/" target="_blank" rel="noopener noreferrer" className="chip">Facebook</a>
              <a href="https://www.mercadolibre.com.co/pagina/viveroverde_suculento" target="_blank" rel="noopener noreferrer" className="chip">Mercado Libre</a>
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
              <li><Link href="/mis-pedidos">Mis pedidos</Link></li>
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
              <li><a href={`tel:${CONTACTO.telefonoTel}`}>{CONTACTO.telefono}</a></li>
              <li><a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a></li>
              <li>{CONTACTO.horario}</li>
              {CONTACTO.sedes.map((sede) => (
                <li key={sede.id}>
                  <strong style={{ display: 'block', fontWeight: 500 }}>{sede.nombre}</strong>
                  <a href={sede.mapa} target="_blank" rel="noopener noreferrer">{sede.direccion}</a>
                </li>
              ))}
            </ul>
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
