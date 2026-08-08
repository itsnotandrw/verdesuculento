import type { Metadata } from 'next';
import Link from 'next/link';
import { orders } from '@/lib/orders/store';
import { toPublicOrder } from '@/lib/orders/types';
import { paymentProvider } from '@/lib/payments';
import { env } from '@/lib/env';
import OrderStatus from './OrderStatus';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu pedido · VERDE.',
  description: 'Estado de tu pedido, datos de pago y seguimiento del envío.',
  // La referencia es la llave de acceso al pedido: no debe terminar indexada.
  robots: { index: false, follow: false },
};

export default async function PedidoPage({ params }: { params: { reference: string } }) {
  const pedido = await orders.byReference(params.reference);

  // Un 404 genérico aquí es cruel: el cliente acaba de comprar y lo único que
  // ve es "página no encontrada". Se le muestra su referencia y una salida.
  if (!pedido) return <PedidoNoEncontrado referencia={params.reference} />;

  const proveedor = paymentProvider();

  // Las instrucciones se reconstruyen en el servidor en cada visita: así el
  // cliente puede cerrar la pestaña y volver más tarde con el enlace, sin
  // depender de nada guardado en el navegador.
  const instrucciones =
    pedido.payment.method === 'BREB' && pedido.payment.status !== 'approved'
      ? {
          brebKey: env.payments.breb.key,
          keyType: env.payments.breb.keyType,
          holder: env.payments.breb.holder,
          bank: env.payments.breb.bank,
          nequi: env.payments.breb.nequi || null,
        }
      : null;

  return (
    <OrderStatus
      inicial={toPublicOrder(pedido)}
      instrucciones={instrucciones}
      requiereVerificacionManual={proveedor.requiresManualVerification}
    />
  );
}

function PedidoNoEncontrado({ referencia }: { referencia: string }) {
  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>PEDIDO NO ENCONTRADO</div>
        <h1 className="display" style={{ fontSize: 'clamp(36px, 8vw, 60px)', marginBottom: 20, lineHeight: 1.05 }}>
          No encontramos este pedido<em style={{ color: 'var(--accent)' }}>.</em>
        </h1>

        <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, marginBottom: 28 }}>
          Revisa que la referencia esté completa. Si acabas de hacer la compra y ya transfeririste,
          escríbenos con este código y lo resolvemos de inmediato — tu dinero está seguro.
        </p>

        <div className="pay-field" style={{ marginBottom: 32 }}>
          <div style={{ minWidth: 0 }}>
            <div className="pay-field-label">Referencia que buscaste</div>
            <div className="pay-field-value">{referencia}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/catalogo" className="btn btn-primary">Ver catálogo <span className="btn-arrow">→</span></Link>
          <Link href="/asesoria" className="btn btn-ghost">Contactar al vivero</Link>
        </div>
      </div>
    </div>
  );
}
