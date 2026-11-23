/**
 * Correos al cliente por Resend (API HTTP, sin librería). SOLO SERVIDOR.
 *
 *  - Pedido recibido: lleva el TICKET (la referencia VS-XXXXXX) y el enlace para ver el pedido.
 *  - Comprobante de pago: al confirmarse el pago.
 *  - Lista de pedidos: lo que recibe quien busca "por correo" en Mis pedidos (nada se muestra en pantalla).
 *
 * Nunca rompen el flujo de compra: si Resend falla, se registra el error y el pedido sigue.
 * Sin RESEND_API_KEY (desarrollo) el correo se imprime en la consola.
 */

import { env } from '@/lib/env';
import { baseUrl } from '@/lib/seo';
import type { Order } from './types';

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export async function enviarCorreo(para: string, asunto: string, html: string, texto: string): Promise<void> {
  if (!env.resendApiKey || !env.resendFrom) {
    console.log(`[correo] (sin RESEND_API_KEY) para ${para} · ${asunto}\n${texto}`);
    return;
  }
  const respuesta = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.resendFrom, to: [para], subject: asunto, html, text: texto }),
  });
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 200)}`);
}

/** Envuelve sin lanzar: un correo fallido no puede tumbar una compra. */
export function enviarSinFallar(tarea: Promise<void>, que: string): void {
  tarea.catch((e) => console.error(`[correo] no se pudo enviar (${que}):`, e instanceof Error ? e.message : e));
}

function marco(titulo: string, cuerpo: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
    <h2 style="color:#0b4f2c;margin-bottom:4px">Vivero Verde Suculento</h2>
    <h3 style="margin-top:0">${titulo}</h3>${cuerpo}
    <p style="font-size:12px;color:#5f6368;margin-top:28px">¿Dudas? Escríbenos por WhatsApp al +57 320 335 4821.</p></div>`;
}

const enlace = (o: Pick<Order, 'reference'>) => `${baseUrl()}/pedido/${o.reference}`;

function resumen(o: Order): string {
  const filas = o.lines.map((l) => `<tr><td style="padding:4px 0">${esc(l.name)} × ${l.qty}</td><td style="text-align:right">${cop(l.unitPrice * l.qty)}</td></tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">${filas}
    <tr><td style="padding:4px 0;color:#5f6368">Envío</td><td style="text-align:right">${cop(o.shippingCost)}</td></tr>
    ${o.couponDiscount ? `<tr><td style="padding:4px 0;color:#5f6368">Cupón ${esc(o.coupon?.code ?? '')}</td><td style="text-align:right">-${cop(o.couponDiscount)}</td></tr>` : ''}
    <tr><td style="padding:8px 0;border-top:1px solid #ddd"><b>Total</b></td><td style="text-align:right;border-top:1px solid #ddd"><b>${cop(o.total)}</b></td></tr></table>`;
}

const ticketHtml = (o: Order) => `<div style="background:#f1f5f2;border-radius:10px;padding:14px 18px;margin:14px 0"><div style="font-size:12px;color:#5f6368">TU TICKET DE PEDIDO</div><div style="font-size:24px;font-weight:700;letter-spacing:.06em;color:#0b4f2c">${esc(o.reference)}</div></div>`;
const botonHtml = (o: Order, texto: string) => `<p style="margin:22px 0"><a href="${enlace(o)}" style="background:#0b4f2c;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${texto}</a></p>`;

export async function correoPedidoRecibido(o: Order): Promise<void> {
  const contra = o.payment.method === 'COD';
  const html = marco(`Recibimos tu pedido${o.orderNumber ? ` #${o.orderNumber}` : ''}`,
    `<p>Hola ${esc(o.customer.nombre)}, gracias por tu compra.</p>${ticketHtml(o)}${resumen(o)}
     <p style="font-size:14px">${contra ? 'Pagas en efectivo al recibir. Te escribiremos por WhatsApp para confirmar el pedido antes de despacharlo.' : 'Cuando se confirme tu pago te enviaremos el comprobante a este correo.'}</p>
     ${botonHtml(o, 'Ver mi pedido')}
     <p style="font-size:12px;color:#5f6368">Guarda este ticket: con él (o con tu correo) puedes consultar tu pedido en «Mis pedidos».</p>`);
  const texto = `Recibimos tu pedido. Tu ticket: ${o.reference}\nTotal: ${cop(o.total)}\nVer pedido: ${enlace(o)}`;
  await enviarCorreo(o.customer.email, `Pedido recibido · ticket ${o.reference}`, html, texto);
}

export async function correoComprobante(o: Order): Promise<void> {
  const fecha = new Date(o.payment.approvedAt ?? Date.now()).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' });
  const html = marco('Comprobante de pago',
    `<p>Hola ${esc(o.customer.nombre)}, confirmamos tu pago. Estamos preparando tu pedido.</p>${ticketHtml(o)}
     <table style="font-size:14px;margin-bottom:8px"><tr><td style="color:#5f6368;padding-right:14px">Fecha</td><td>${esc(fecha)}</td></tr>
     <tr><td style="color:#5f6368;padding-right:14px">Método</td><td>${esc(o.payment.method)}</td></tr>
     <tr><td style="color:#5f6368;padding-right:14px">Referencia de pago</td><td>${esc(o.payment.reference)}</td></tr>
     <tr><td style="color:#5f6368;padding-right:14px">Entrega</td><td>${esc(o.selectedQuote.etaLabel)}</td></tr></table>
     ${resumen(o)}${botonHtml(o, 'Ver el estado de mi pedido')}`);
  const texto = `Comprobante de pago. Ticket ${o.reference}. Pagado: ${cop(o.total)} el ${fecha}. Ref. de pago: ${o.payment.reference}. Estado: ${enlace(o)}`;
  await enviarCorreo(o.customer.email, `Comprobante de pago · ticket ${o.reference}`, html, texto);
}

export async function correoEnvio(o: Order): Promise<void> {
  const g = o.shipment;
  if (!g) return;
  const html = marco('Tu pedido ya tiene guía',
    `<p>Hola ${esc(o.customer.nombre)}, ya generamos la guía de tu pedido. Cuando la transportadora lo recoja verás cada avance en el enlace.</p>${ticketHtml(o)}
     <table style="font-size:14px;margin-bottom:8px"><tr><td style="color:#5f6368;padding-right:14px">Transportadora</td><td>${esc(g.carrier)}</td></tr>
     <tr><td style="color:#5f6368;padding-right:14px">Número de guía</td><td><b>${esc(g.trackingNumber)}</b></td></tr>
     <tr><td style="color:#5f6368;padding-right:14px">Entrega estimada</td><td>${esc(o.selectedQuote.etaLabel)}</td></tr></table>
     ${botonHtml(o, 'Seguir mi pedido')}
     <p style="font-size:12px;color:#5f6368">Tus plantas viajan vivas: si la transportadora te llama o toca, recíbelas el mismo día para que lleguen en su mejor estado.</p>`);
  const texto = `Tu pedido tiene guía. ${g.carrier} · ${g.trackingNumber}. Ticket ${o.reference}. Seguimiento: ${enlace(o)}`;
  await enviarCorreo(o.customer.email, `Tu pedido ya tiene guía · ${g.carrier} ${g.trackingNumber}`, html, texto);
}

export async function correoListaPedidos(correo: string, pedidos: Order[]): Promise<void> {
  const filas = pedidos.map((o) => `<tr><td style="padding:6px 0"><a href="${enlace(o)}" style="color:#0b4f2c;font-weight:600">${esc(o.reference)}</a></td><td>${new Date(o.createdAt).toLocaleDateString('es-CO')}</td><td style="text-align:right">${cop(o.total)}</td></tr>`).join('');
  const html = marco('Tus pedidos', `<p>Estos son los pedidos hechos con este correo. Pulsa el ticket para ver el estado de cada uno.</p><table style="width:100%;font-size:14px;border-collapse:collapse">${filas}</table>`);
  const texto = pedidos.map((o) => `${o.reference} · ${new Date(o.createdAt).toLocaleDateString('es-CO')} · ${cop(o.total)} · ${enlace(o)}`).join('\n');
  await enviarCorreo(correo, 'Tus pedidos en Vivero Verde Suculento', html, texto);
}
