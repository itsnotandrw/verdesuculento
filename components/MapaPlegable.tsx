'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Layers, Navigation, Sprout } from 'lucide-react';
import { CONTACTO } from '@/data/contacto';
import MapaEmbed from '@/components/MapaEmbed';
import { precalentarMapas, urlRuta } from '@/lib/mapas';

/**
 * Mapa de las sedes que se abre como un mapa de papel plegado: una hoja kraft arrugada, con una hoja de
 * planta, cubre el mapa; al tocarla se despliega en tres paneles (dos puertas laterales y el panel
 * central que sube) y deja ver el mapa interactivo de Google (arrastrable, con zoom y satélite).
 */
export default function MapaPlegable() {
  const [abierto, setAbierto] = useState(false);
  const [cargar, setCargar] = useState(false);
  const [sede, setSede] = useState<string>(CONTACTO.sedes[0].id);
  const [satelite, setSatelite] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const primera = useRef(true);

  const sedeActual = CONTACTO.sedes.find((s) => s.id === sede) ?? CONTACTO.sedes[0];
  const consulta = sedeActual.coords ? `${sedeActual.coords.lat},${sedeActual.coords.lng}` : sedeActual.direccion;
  const rutaUrl = urlRuta(consulta);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    if (primera.current) { primera.current = false; return; }
    const rapido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const izq = el.querySelector('.mp-p1');
    const cen = el.querySelector('.mp-p2');
    const der = el.querySelector('.mp-p3');
    const hoja = el.querySelector('.mp-papel');
    const d = rapido ? 0 : 1;
    tl.current?.kill();
    const t = gsap.timeline();
    if (abierto) {
      t.set(hoja, { display: 'block' }, 0)
        .to(cen, { rotateX: -112, duration: 0.9 * d, ease: 'power3.inOut' }, 0)
        .to(izq, { rotateY: -118, duration: 1.0 * d, ease: 'power3.inOut' }, 0.15 * d)
        .to(der, { rotateY: 118, duration: 1.0 * d, ease: 'power3.inOut' }, 0.15 * d)
        .to(hoja, { autoAlpha: 0, duration: 0.25 * d }, 0.95 * d)
        .set(hoja, { display: 'none' });
    } else {
      t.set(hoja, { display: 'block', autoAlpha: 1 }, 0)
        .to([izq, der], { rotateY: 0, duration: 0.8 * d, ease: 'power3.inOut' }, 0)
        .to(cen, { rotateX: 0, duration: 0.8 * d, ease: 'power3.inOut' }, 0.1 * d);
    }
    tl.current = t;
    return () => { tl.current?.kill(); };
  }, [abierto]);

  const abrir = () => { setCargar(true); setAbierto(true); };

  const arte = (
    <div className="mp-arte" aria-hidden="true">
      <div className="mp-hoja-ico"><Sprout size={64} strokeWidth={1.3} /></div>
      <div className="mp-titulo">Mapa del vivero</div>
      <div className="mp-sub">Dos sedes · Cundinamarca</div>
      <div className="mp-pista">Toca para desplegar</div>
    </div>
  );

  return (
    <div className={`mp${abierto ? ' open' : ''}`} ref={raiz}>
      <div className="mp-mapa">
        {cargar && <MapaEmbed consulta={consulta} zoom={satelite ? 17 : 16} satelite={satelite} titulo={`Mapa: ${sedeActual.nombre}`} />}
        <div className="mp-tabs">
          {CONTACTO.sedes.map((s) => (
            <button type="button" key={s.id} className={sede === s.id ? 'on' : ''} onClick={() => setSede(s.id)}>{s.id === 'envios' ? 'Soacha' : 'Santandercito'}</button>
          ))}
        </div>
        <div className="mp-bar">
          <span>{sedeActual.nombre}</span>
          <div>
            <button type="button" onClick={() => setSatelite((v) => !v)}><Layers size={14} aria-hidden="true" /> {satelite ? 'Mapa' : 'Satélite'}</button>
            <a href={rutaUrl} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Cómo llegar</a>
            <button type="button" onClick={() => setAbierto(false)}>Plegar</button>
          </div>
        </div>
      </div>

      <button type="button" className="mp-papel" onClick={abrir} onPointerEnter={precalentarMapas} aria-label="Desplegar el mapa de las sedes" aria-expanded={abierto}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`mp-panel mp-p${n}`}>
            <span className="mp-inner" style={{ left: `${-(n - 1) * 100}%` }}>
              <span className="mp-textura" />
              {arte}
            </span>
          </span>
        ))}
      </button>
    </div>
  );
}
