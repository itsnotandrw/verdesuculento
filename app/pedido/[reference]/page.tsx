import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  if (!pedido) notFound();

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
