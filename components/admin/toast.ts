// Avisos tipo "toast" del panel: toast('Guardado') o toast('Error…', 'bad') desde cualquier componente.
export type ToastKind = 'ok' | 'bad';
export function toast(message: string, kind: ToastKind = 'ok') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('adm-toast', { detail: { message, kind } }));
}
