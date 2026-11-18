/** Firma compartida entre el arranque (instrumentation.ts) y /api/interno/refrescar. SOLO SERVIDOR. */

import { createHmac } from 'crypto';

export function firmaRefresco(): string | null {
  const secreto = (process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET || '').trim();
  if (!secreto) return null;
  return createHmac('sha256', secreto).update('refresco-de-arranque').digest('hex');
}
