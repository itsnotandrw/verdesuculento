/**
 * Bloqueo de scroll para ventanas emergentes, carrito lateral y menús. Fija el cuerpo de la página pero RECUERDA la
 * posición: antes, `position: fixed` sin `top` mandaba la página al inicio cada vez que se abría algo.
 * Es idempotente: bloquear dos veces o desbloquear sin bloquear no hace nada raro.
 */

let bloqueado = false;
let guardado = 0;

export function bloquearScroll(): void {
  if (typeof document === 'undefined' || bloqueado) return;
  bloqueado = true;
  guardado = window.scrollY;
  const b = document.body;
  b.style.top = `-${guardado}px`;
  b.classList.add('scroll-locked');
}

export function desbloquearScroll(): void {
  if (typeof document === 'undefined' || !bloqueado) return;
  bloqueado = false;
  const b = document.body;
  b.classList.remove('scroll-locked');
  b.style.top = '';
  window.scrollTo({ top: guardado, left: 0, behavior: 'instant' as ScrollBehavior });
}
