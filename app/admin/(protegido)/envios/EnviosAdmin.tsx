'use client';

/**
 * Envíos · estado de la integración con Envía y prueba de cobertura.
 *
 * «Probar» cotiza con TODAS las transportadoras de Envía en Colombia para una ciudad (no solo las del checkout), con un
 * paquete típico, para ver en producción cuáles cubren de verdad y a qué precio.
 */

import { useCallback, useEffect, useState } from 'react';
import { formatCOP } from '@/data/catalog';

interface Estado {
  proveedorActivo: string;
  enviaConfigurado: boolean;
  ambiente: 'produccion' | 'pruebas';
  transportadoras: string[];
  origen: { ciudad: string; departamento: string; direccion: string };
  direccionPublicada: string;
  contraEntrega: boolean;
  webhookSecretConfigurado: boolean;
  urlWebhook: string;
}
interface Resultado {
  carrier: string;
  nombre: string;
  ok: boolean;
  ms: number;
  opciones: Array<{ servicio: string; precio: number; plazo: string }>;
  error?: string;
  enCheckout: boolean;
}

const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];

export default function EnviosAdmin() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [departamento, setDepartamento] = useState('Antioquia');
  const [ciudad, setCiudad] = useState('Medellín');
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [probando, setProbando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch('/api/admin/envia?accion=estado', { cache: 'no-store' });
    if (r.ok) setEstado(await r.json());
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const probar = async (e: React.FormEvent) => {
    e.preventDefault();
    setProbando(true);
    setError(null);
    setResultados(null);
    try {
      const r = await fetch(`/api/admin/envia?accion=probar&departamento=${encodeURIComponent(departamento)}&ciudad=${encodeURIComponent(ciudad)}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo probar.');
      setResultados(d.resultados);
    } catch (er) {
      setError(er instanceof Error ? er.message : 'No se pudo probar.');
    } finally {
      setProbando(false);
    }
  };

  const registrarWebhook = async () => {
    setError(null);
    setMensaje(null);
    try {
      const r = await fetch('/api/admin/envia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'registrar-webhook' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo registrar.');
      setMensaje('Webhook registrado en Envía. Falta poner el secreto que te dé Envía en SHIPPING_WEBHOOK_SECRET.');
    } catch (er) {
      setError(er instanceof Error ? er.message : 'No se pudo registrar.');
    }
  };

  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const direccionDistinta = estado ? norm(estado.origen.direccion) !== norm(estado.direccionPublicada) : false;
  const pill = (tono: 'ok' | 'bad' | 'wait', texto: string) => <span className="status-pill" data-tone={tono}>{texto}</span>;

  return (
    <div style={{ paddingTop: 20, paddingBottom: 80 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 24 }}>Envíos</h1>

      {estado && (
        <div className="pay-panel" style={{ padding: 18, marginBottom: 28, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {pill(estado.proveedorActivo === 'envia' && estado.enviaConfigurado ? 'ok' : 'bad', estado.proveedorActivo === 'envia' ? 'Envía activo' : `Proveedor: ${estado.proveedorActivo}`)}
            {pill(estado.ambiente === 'produccion' ? 'ok' : 'wait', estado.ambiente === 'produccion' ? 'Producción (guías reales y con costo)' : 'Pruebas (sandbox)')}
            {pill(estado.contraEntrega ? 'wait' : 'ok', estado.contraEntrega ? 'Contra entrega ACTIVA' : 'Contra entrega apagada')}
            {pill(estado.webhookSecretConfigurado ? 'ok' : 'wait', estado.webhookSecretConfigurado ? 'Secreto de webhook puesto' : 'Webhook sin secreto')}
          </div>
          {direccionDistinta && (
            <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: 'color-mix(in oklab, #ef4444 12%, var(--bg-elev))', border: '1px solid color-mix(in oklab, #ef4444 40%, transparent)', fontSize: 13, lineHeight: 1.55 }}>
              <b>Revisa la dirección de la bodega.</b> Las guías saldrán desde «{estado?.origen.direccion}», pero la dirección publicada del negocio es «{estado?.direccionPublicada}». Corrige la variable <span className="mono">SHIPPING_ORIGIN_ADDRESS</span> en Railway (o bórrala para usar la correcta) antes de generar guías reales.
            </div>
          )}
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-dim)' }}>
            Bodega: {estado.origen.direccion}, {estado.origen.ciudad}, {estado.origen.departamento}.<br />
            El checkout cotiza con: <span className="mono">{estado.transportadoras.join(', ')}</span>. Para sumar o quitar una, edita la variable{' '}
            <span className="mono">ENVIA_CARRIERS</span> en Railway.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={registrarWebhook}>Registrar webhook de seguimiento</button>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>{estado.urlWebhook}</span>
          </div>
        </div>
      )}

      <form onSubmit={probar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18 }}>
        <div style={{ minWidth: 200 }}>
          <label className="checkout-label" htmlFor="env-dep">Departamento</label>
          <select id="env-dep" className="checkout-input" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
            {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <label className="checkout-label" htmlFor="env-ciu">Ciudad</label>
          <input id="env-ciu" className="checkout-input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={probando}>{probando ? 'Cotizando con todas…' : 'Probar cobertura y precios'}</button>
      </form>
      <p style={{ fontSize: 12.5, color: 'var(--fg-mute)', marginBottom: 20 }}>
        Cotiza un paquete de 2 kg (40 × 20 × 12 cm, valor $60.000) con todas las transportadoras de Envía en Colombia. Las marcadas «checkout» son las que ve el cliente.
      </p>

      {error && <p role="alert" style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}
      {mensaje && <p role="status" style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>{mensaje}</p>}

      {resultados && (
        <div style={{ display: 'grid', gap: 10 }}>
          {[...resultados].sort((a, b) => Number(b.ok) - Number(a.ok) || a.nombre.localeCompare(b.nombre)).map((r) => (
            <div key={r.carrier} className="pay-panel" style={{ padding: 14, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b style={{ fontSize: 14 }}>{r.nombre}</b>
                {pill(r.ok ? 'ok' : 'bad', r.ok ? 'Cotiza' : 'No cotiza')}
                {r.enCheckout && <span className="badge-inline">checkout</span>}
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{r.ms} ms</span>
              </div>
              {r.ok ? (
                <div style={{ display: 'grid', gap: 4 }}>
                  {r.opciones.map((o, i) => (
                    <div key={i} className="mono" style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span>{o.servicio}{o.plazo ? ` · ${o.plazo}` : ''}</span>
                      <span>{formatCOP(o.precio)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--fg-dim)' }}>{r.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
