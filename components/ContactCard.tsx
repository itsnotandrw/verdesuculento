'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronDown, Clock, Layers, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { CONTACTO } from '@/data/contacto';
import MapaEmbed from '@/components/MapaEmbed';
import { precalentarMapas, urlRuta } from '@/lib/mapas';

const WA_PATH = 'M16.04 3C9.4 3 4 8.4 4 15.04c0 2.13.56 4.2 1.62 6.03L4 29l8.1-1.59a12.02 12.02 0 0 0 3.94.66C22.68 28.07 28 22.67 28 16.03 28 9.4 22.68 3 16.04 3Zm0 22.06c-1.28 0-2.53-.34-3.62-.98l-.26-.15-4.8.94.99-4.68-.17-.27a9.96 9.96 0 0 1-1.53-5.3c0-5.5 4.47-9.97 9.98-9.97 5.5 0 9.97 4.47 9.97 9.97 0 5.5-4.47 9.97-9.97 9.97Zm5.47-7.47c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z';

export function IconoWhatsApp({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d={WA_PATH} /></svg>;
}

/**
 * Tarjeta de contacto que se despliega (estilo "card nav"): abre un panel con animación GSAP
 * que muestra los datos de contacto y un mapa interactivo (arrastrable, con zoom y vista satélite)
 * de las dos sedes del vivero.
 */
export default function ContactCard() {
  const [abierto, setAbierto] = useState(false);
  const [yaAbierto, setYaAbierto] = useState(false); // el mapa se carga solo la primera vez que se abre
  const [sede, setSede] = useState<string>(CONTACTO.sedes[0].id);
  const [satelite, setSatelite] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const sedeActual = CONTACTO.sedes.find((s) => s.id === sede) ?? CONTACTO.sedes[0];
  const consulta = sedeActual.consulta ?? (sedeActual.coords ? `${sedeActual.coords.lat},${sedeActual.coords.lng}` : sedeActual.direccion);
  const rutaUrl = urlRuta(sedeActual.coords ? `${sedeActual.coords.lat},${sedeActual.coords.lng}` : consulta);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rapido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tlRef.current?.kill();
    const items = panel.querySelectorAll('.cc-item');
    if (abierto) {
      const tl = gsap.timeline();
      tl.set(panel, { display: 'block' })
        .fromTo(panel, { height: 0 }, { height: 'auto', duration: rapido ? 0 : 0.75, ease: 'power3.out' })
        .fromTo(items, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: rapido ? 0 : 0.5, ease: 'power3.out', stagger: 0.09 }, '-=0.45');
      tlRef.current = tl;
    } else {
      const tl = gsap.timeline();
      tl.to(items, { y: 16, opacity: 0, duration: rapido ? 0 : 0.2, stagger: 0.03 })
        .to(panel, { height: 0, duration: rapido ? 0 : 0.5, ease: 'power3.inOut' }, '-=0.1')
        .set(panel, { display: 'none' });
      tlRef.current = tl;
    }
    return () => { tlRef.current?.kill(); };
  }, [abierto]);

  const alternar = () => {
    setAbierto((v) => !v);
    setYaAbierto(true);
  };

  return (
    <div className={`cc${abierto ? ' open' : ''}`}>
      <div className="cc-top">
        <div className="cc-top-info">
          <h4>Contacto</h4>
          <a href={`tel:${CONTACTO.telefonoTel}`}><Phone size={15} aria-hidden="true" /> {CONTACTO.telefono}</a>
          <a href={`mailto:${CONTACTO.email}`}><Mail size={15} aria-hidden="true" /> {CONTACTO.email}</a>
        </div>
        <button type="button" className="cc-toggle" onClick={alternar} onPointerEnter={precalentarMapas} aria-expanded={abierto} aria-controls="cc-panel">
          <span>{abierto ? 'Cerrar' : 'Ubicaciones y mapa'}</span>
          <ChevronDown size={16} aria-hidden="true" className="cc-chev" />
        </button>
      </div>

      <div id="cc-panel" className="cc-panel" ref={panelRef} style={{ display: 'none', height: 0 }}>
        <div className="cc-grid">
          <div className="cc-side">
            <a className="cc-item cc-card" href={`${CONTACTO.whatsappUrl}?text=${encodeURIComponent('Hola, quisiera más información.')}`} target="_blank" rel="noopener noreferrer">
              <span className="cc-ico wa"><IconoWhatsApp size={18} /></span>
              <span><b>Escríbenos por WhatsApp</b><small>Respuesta rápida · {CONTACTO.telefono}</small></span>
            </a>
            <div className="cc-item cc-card">
              <span className="cc-ico"><Clock size={18} aria-hidden="true" /></span>
              <span><b>Horario de atención</b><small>{CONTACTO.horario}</small></span>
            </div>
            {CONTACTO.sedes.map((s) => (
              <button type="button" key={s.id} className={`cc-item cc-card cc-sede${sede === s.id ? ' on' : ''}`} onClick={() => setSede(s.id)}>
                <span className="cc-ico"><MapPin size={18} aria-hidden="true" /></span>
                <span><b>{s.nombre}</b><small>{s.direccion}</small></span>
              </button>
            ))}
          </div>

          <div className={`cc-item cc-map${satelite ? ' sat' : ''}`}>
            {yaAbierto && <MapaEmbed consulta={consulta} zoom={satelite ? 17 : 16} satelite={satelite} titulo={`Mapa: ${sedeActual.nombre}`} />}
            <div className="cc-map-bar">
              <span>{sedeActual.nombre}</span>
              <div>
                <button type="button" onClick={() => setSatelite((v) => !v)} aria-pressed={satelite}><Layers size={14} aria-hidden="true" /> {satelite ? 'Mapa' : 'Satélite'}</button>
                <a href={rutaUrl} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Cómo llegar</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
