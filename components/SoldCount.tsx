/**
 * Unidades vendidas, con el mismo redondeo por tramos que usan los
 * marketplaces: "+250 vendidos" en vez de "467 vendidos".
 *
 * No es maquillaje, es precisión honesta — el dato viene del histórico real de
 * Mercado Libre y se redondea **hacia abajo**, así que la cifra mostrada
 * siempre se queda corta frente a la real. Un número exacto y muy específico
 * además se lee como inventado.
 */

const TRAMOS = [5000, 1000, 500, 250, 100, 50, 25, 10, 5];

export function formatVendidos(n: number): string | null {
  if (!n || n < 3) return null;

  const tramo = TRAMOS.find((t) => n >= t);
  if (!tramo) return `${n} vendidos`;

  return `+${tramo.toLocaleString('es-CO')} vendidos`;
}

export default function SoldCount({ count, size = 12 }: { count: number; size?: number }) {
  const texto = formatVendidos(count);
  if (!texto) return null;

  return (
    <span className="mono" style={{ fontSize: size, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>
      {texto}
    </span>
  );
}
