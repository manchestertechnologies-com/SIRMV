// Small interaction details used by modern product sites. Started once from
// main.tsx. All of it is skipped for users who prefer reduced motion.

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initUiEffects() {
  if (typeof window === 'undefined') return;

  // ---- tap feedback: ripple on filled buttons + a light haptic tick on touch ----
  document.addEventListener(
    'pointerdown',
    (e) => {
      const btn = (e.target as HTMLElement).closest?.('button') as HTMLButtonElement | null;
      if (!btn || btn.disabled || btn.hasAttribute('data-no-ripple')) return;
      if (e.pointerType === 'touch' && 'vibrate' in navigator) {
        try { navigator.vibrate(6); } catch { /* not supported */ }
      }
      if (reduce()) return;
      const cls = typeof btn.className === 'string' ? btn.className : '';
      if (!/bg-|mt-nav-item|mt-preset|mt-tile/.test(cls)) return;
      const r = btn.getBoundingClientRect();
      if (r.width < 28 || r.height < 24 || r.width > 520) return;
      const pos = getComputedStyle(btn).position;
      const hadStatic = pos === 'static';
      if (hadStatic) btn.style.position = 'relative';
      const prevOverflow = btn.style.overflow;
      btn.style.overflow = 'hidden';
      const size = Math.max(r.width, r.height) * 2;
      const dot = document.createElement('span');
      dot.className = 'mt-ripple';
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - r.left - size / 2}px`;
      dot.style.top = `${e.clientY - r.top - size / 2}px`;
      btn.appendChild(dot);
      window.setTimeout(() => {
        dot.remove();
        btn.style.overflow = prevOverflow;
        if (hadStatic) btn.style.position = '';
      }, 750);
    },
    { passive: true }
  );

  // ---- gentle 3D tilt on dashboard tiles (mouse / pen only) ----
  let tilted: HTMLElement | null = null;
  const clear = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch' || reduce()) return;
      const tile = (e.target as HTMLElement).closest?.('.mt-tile') as HTMLElement | null;
      if (tile !== tilted) { clear(tilted); tilted = tile; }
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tile.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
      tile.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => { clear(tilted); tilted = null; }, true);

  // ---- header gains depth once the page content has scrolled ----
  document.addEventListener(
    'scroll',
    (e) => {
      const t = e.target as HTMLElement | Document;
      const el = (t instanceof Document ? document.scrollingElement : t) as HTMLElement | null;
      if (!el || (el !== document.scrollingElement && el.tagName !== 'MAIN')) return;
      document.body.classList.toggle('mt-scrolled', el.scrollTop > 6);
    },
    { capture: true, passive: true }
  );
}
