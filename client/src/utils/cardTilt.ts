// Gentle 3D tilt for cards: they lean towards the pointer (a few degrees) and catch a soft highlight.
// Only on devices with a real pointer, never for reduced-motion users, and never on boxes holding a 3D scene.
const SEL = '.mt-tile-card, main .grid > [class*="rounded-2xl"], main .grid > [class*="rounded-3xl"], .mt-glass-card';
export const initCardTilt = () => {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let cur: HTMLElement | null = null;
  const reset = (el: HTMLElement | null) => { if (!el) return; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.classList.remove('mt-tilting'); };
  document.addEventListener('pointermove', (e) => {
    const el = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
    if (el !== cur) { reset(cur); cur = el; }
    if (!el || el.querySelector('canvas')) return;
    const r = el.getBoundingClientRect(); if (r.width > 520 || r.height > 420) return;           // big panels stay still
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.classList.add('mt-tilting');
    el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`); el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(0)}%`); el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(0)}%`);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { reset(cur); cur = null; }, true);
};
