/**
 * Utilidades compartidas por los route handlers. SOLO SERVIDOR.
 *
 * Sin dependencias externas de validación a propósito: el proyecto tiene tres
 * dependencias en total y estas rutas reciben ocho formas distintas de cuerpo.
 * Agregar una librería de esquemas por eso no se paga.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

/** Convierte una excepción en respuesta sin filtrar detalles internos. */
export function fallo(error: unknown, contexto: string): NextResponse {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`[api] ${contexto}:`, error);

  // Los errores de dominio son seguros de mostrar; el resto no.
  const esDominio = error instanceof Error && ['OrderError', 'ShippingNotConfiguredError', 'PaymentNotConfiguredError', 'PaymentMethodNotSupportedError', 'CodNotAvailableError', 'DestinoNoResueltoError', 'SinTarifasError'].includes(error.name);

  return fail(
    esDominio ? mensaje : 'No pudimos procesar la solicitud. Intenta de nuevo en un momento.',
    esDominio ? 400 : 500,
    error instanceof Error ? (error as { code?: string }).code : undefined
  );
}

// ------------------------------------------------------------- validación

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function texto(valor: unknown, campo: string, opciones: { max?: number; requerido?: boolean } = {}): string {
  const { max = 200, requerido = true } = opciones;
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (!s && requerido) throw new ValidationError(`Falta ${campo}.`);
  return s.slice(0, max);
}

export function email(valor: unknown): string {
  const s = texto(valor, 'el correo', { max: 160 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ValidationError('El correo no es válido.');
  return s.toLowerCase();
}

export function telefono(valor: unknown): string {
  const s = texto(valor, 'el teléfono', { max: 30 });
  const digitos = s.replace(/\D/g, '');
  if (digitos.length < 7) throw new ValidationError('El teléfono no es válido.');
  return s;
}

export function entero(valor: unknown, campo: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ValidationError(`${campo} no es válido.`);
  }
  return n;
}

/** Líneas del carrito tal como llegan del navegador. */
export function lineasCarrito(valor: unknown): Array<{ productId: string; color: string; size: string; qty: number }> {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new ValidationError('El carrito está vacío.');
  }
  if (valor.length > 50) {
    throw new ValidationError('Demasiados productos en el carrito.');
  }

  return valor.map((linea) => {
    const l = linea as Record<string, unknown>;
    return {
      productId: texto(l.productId, 'el producto', { max: 40 }),
      color: texto(l.color, 'la variedad', { max: 60, requerido: false }),
      size: texto(l.size, 'la presentación', { max: 60, requerido: false }),
      qty: entero(l.qty ?? 1, 'La cantidad', 1, 99),
    };
  });
}

export async function cuerpo(request: Request): Promise<Record<string, unknown>> {
  try {
    const json = await request.json();
    if (!json || typeof json !== 'object') throw new Error();
    return json as Record<string, unknown>;
  } catch {
    throw new ValidationError('El cuerpo de la solicitud no es JSON válido.');
  }
}

// ------------------------------------------------------------------- admin

/**
 * Autoriza las rutas del panel.
 *
 * Si `ADMIN_API_TOKEN` no está configurado, responde 503 en vez de dejar todo
 * abierto: un endpoint que marca pedidos como pagados no puede tener
 * autenticación opcional.
 */
export function autorizarAdmin(request: Request): NextResponse | null {
  if (!env.adminToken) {
    return fail(
      'El panel no está habilitado: falta configurar ADMIN_API_TOKEN en .env.local.',
      503
    );
  }

  const cabecera = request.headers.get('authorization') ?? '';
  const recibido = cabecera.replace(/^Bearer\s+/i, '').trim();

  if (!recibido) return fail('No autorizado.', 401);

  const a = Buffer.from(recibido, 'utf-8');
  const b = Buffer.from(env.adminToken, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail('No autorizado.', 401);

  return null;
}

/** Cabeceras que llegan al webhook, en minúscula, para buscar la firma. */
export function cabeceras(request: Request): Record<string, string> {
  const salida: Record<string, string> = {};
  request.headers.forEach((valor, llave) => {
    salida[llave.toLowerCase()] = valor;
  });
  return salida;
}
