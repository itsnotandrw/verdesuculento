import { randomBytes, randomUUID } from 'crypto';

/**
 * Alfabeto sin caracteres ambiguos: nada de 0/O, 1/I/L. La referencia se dicta
 * por WhatsApp y se escribe a mano en el campo de descripción de una
 * transferencia — cada carácter confundible es un pago que no se concilia.
 */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function codigo(largo: number): string {
  const bytes = randomBytes(largo);
  let salida = '';
  for (let i = 0; i < largo; i++) salida += ALFABETO[bytes[i] % ALFABETO.length];
  return salida;
}

/** Identificador interno del pedido. */
export function nuevoOrderId(): string {
  return `ord_${randomUUID()}`;
}

/** Código corto que ve el cliente: VS-A7K4M2. */
export function nuevaReferenciaPedido(): string {
  return `VS-${codigo(6)}`;
}

/**
 * Referencia del intento de pago. Es **por intento**, no por pedido: si el
 * cliente reintenta, nace una nueva. Las pasarelas rechazan referencias
 * repetidas, y en el flujo manual necesitamos distinguir dos transferencias
 * del mismo pedido.
 */
export function nuevaReferenciaPago(referenciaPedido: string): string {
  return `${referenciaPedido}-${codigo(4)}`;
}

/** Id de guía simulada, mientras no haya agregador conectado. */
export function nuevaGuiaLocal(): string {
  return `LOC${codigo(9)}`;
}
